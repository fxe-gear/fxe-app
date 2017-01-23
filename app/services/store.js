'use strict';

angular.module('fxe.services.store', [])

.constant('scoreTypes', {
  amplitude: 1,
  rhythm: 2,
  frequency: 3
})

.constant('lessonTypes', {
  jumping: 1,
  running: 2
})

.service('storeService', function ($ionicPlatform, $cordovaSQLite, $localStorage, $q, $log, scoreTypes, lessonTypes) {

  // prepare default (empty) lesson object
  var emptyLesson = {
    start: null,
    type: null,
    event: null,
    score: {}
  };
  angular.forEach(scoreTypes, function (value, key) {
    emptyLesson.score[value] = 0;
  });

  $localStorage.$default({
    // device related
    deviceID: null,
    pairedID: null,
    ignoredIDs: [],

    // lesson related
    currentLesson: emptyLesson,
    deletedLessons: [],
    newLessons: [],
    lessonLastSync: null,

    // user related
    user: {
      email: null,
      password: null,
      name: null,
      weight: null,
      age: null,
      gender: null,
      units: null,

      provider: {
        jumping: {
          token: null,
          expiresAt: null
        },
        facebook: {
          token: null,
          expiresAt: null
        },
        google: {
          token: null,
          expiresAt: null
        }
      }
    },
    userChanges: {},

    friends: {}
  });

  var db;

  var _getDB = function () {
    if (db) {
      return $q.resolve(db);
    }

    return $ionicPlatform.ready()
      .then(function () {
        // empty version means "doesn't care"

        if (window.sqlitePlugin) { // native sqlite DB
          db = $cordovaSQLite.openDB({
            name: 'store.sqlite',
            bgType: true,
            version: '',
            iosDatabaseLocation: 'default'
          });

        } else { // fallback to websql
          db = window.openDatabase('store', '', null, 2 * 1024 * 1024);
        }

        createSchema(db);
        return db;
      });
  };

  var execSQL = function (query, bindings) {
    return _getDB().then(function (db) {
      return $cordovaSQLite.execute(db, query, bindings)
        .catch(function (err) {
          $log.error('SQL query failed: ' + err.message + ' in query ' + query);
          throw err;
        });
    });
  };

  var prepareDB = function () {
    _getDB();
  };

  var createSchema = function (db) {
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS lesson (start_time DATETIME PRIMARY KEY, end_time DATETIME, type TINYINT NOT NULL, event INT)');
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS score (start_time DATETIME NOT NULL, time DATETIME, score FLOAT NOT NULL, type TINYINT, PRIMARY KEY (start_time, time))');
  };

  var _dumpDB = function () {

    return execSQL('SELECT * FROM lesson', []).then(function (lesson) {
      var res = {
        lesson: [],
        score: []
      };

      for (var i = 0; i < lesson.rows.length; i++) res.lesson.push(lesson.rows.item(i));

      execSQL('SELECT * FROM score', []).then(function (score) {
        for (var i = 0; i < score.rows.length; i++) res.score.push(score.rows.item(i));

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('POST', 'https://dev.fxe-gear.com/api/v1/log');
        xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xmlhttp.send(angular.toJson(res));
        $log.info('Database dumped to remote server.');
      });
    });
  };

  var startLesson = function (type, event) {
    var start = Date.now();

    var promise;
    if (typeof event === 'undefined') {
      promise = execSQL('INSERT INTO lesson (start_time, type) VALUES (?, ?)', [start, type]);
    } else {
      promise = execSQL('INSERT INTO lesson (start_time, type, event) VALUES (?, ?, ?)', [start, type, event]);
    }

    return promise
      .then(function () {
        $localStorage.currentLesson.start = start;
        $localStorage.currentLesson.type = type;
        $localStorage.currentLesson.event = event;
      });
  };

  var addScore = function (score, type) {
    var start = $localStorage.currentLesson.start;
    var time = Date.now();
    var query = 'INSERT INTO score (start_time, time, score, type) VALUES (?, ?, ?, ?)';
    return execSQL(query, [start, time, score, type]).then(function () {
      $localStorage.currentLesson.score[type] = score;
    });
  };

  var endLesson = function () {
    var end = Date.now();
    var start = $localStorage.currentLesson.start;
    var query = 'UPDATE lesson SET end_time = ? WHERE start_time = ?';
    return execSQL(query, [end, start]).then(function () {
      getNewLessons().push(start);
      angular.copy(emptyLesson, $localStorage.currentLesson);
    });
  };

  var addLesson = function (lesson) {
    var queries = [];
    var bindings = [];

    // insert lesson
    queries.push('INSERT INTO lesson (start_time, end_time, type, event) VALUES (?, ?, ?, ?);');
    bindings.push([lesson.start, lesson.end, lesson.type, 'event' in lesson ? lesson.event : null]);

    var j = 0;
    var INSERT_AT_ONCE = 100;

    // for all score records
    while (j < lesson.score.length) {

      var q = ['INSERT INTO score (start_time, time, score, type) VALUES ']; // one query
      var b = []; // binding for this query

      // add score records and break each INSERT_AT_ONCE records
      for (var i = 0; i < INSERT_AT_ONCE && j < lesson.score.length; i++) {
        if (i != 0) q.push(','); // multiple VALUES separator
        q.push('(?,?,?,?)'); // data placeholders
        var s = lesson.score[j]; // index is J (outer index variable!)
        b.push(lesson.start, s.time, s.score, s.type); // bindings
        j++;
      }

      q.push(';');

      // add to ma in query queue
      queries.push(q.join(' '));
      bindings.push(b);
    }

    // run all queries parallely
    queries = queries.map(function (query, i) {
      return execSQL(query, bindings[i]);
    });

    // wait for all queries to finish
    return $q.all(queries);
  };

  var deleteLesson = function (start, dbOnly) {
    // Sqlite BUG: cannot bind multiple statements per query => run 2 queries
    var query = 'DELETE FROM lesson WHERE start_time = ?;';
    return execSQL(query, [start])
      .then(function () {
        query = 'DELETE FROM score WHERE start_time = ?;';
        return execSQL(query, [start]);
      })
      .then(function () {
        // if not dbOnly, then also add to deletedLessons array
        if (dbOnly !== true) getDeletedLessons().push(start);
      });
  };

  var getCurrentLesson = function () {
    return $localStorage.currentLesson;
  };

  var _getLessonsQuery = function () {
    var query = [];
    query.push('SELECT start_time AS start, end_time AS end, type, event, duration, COALESCE(SUM(score), 0) AS score FROM');
    query.push('  (SELECT l.*, (end_time - l.start_time) AS duration, MAX(s.score) AS score, s.type AS score_type FROM lesson l LEFT JOIN score s ON l.start_time = s.start_time GROUP BY l.start_time, score_type)');
    query.push('GROUP BY start_time');
    return query;
  };

  var getLessonCount = function () {
    var q = $q.defer();

    var query = 'SELECT COUNT(1) as count FROM lesson';

    execSQL(query, []).then(function (res) {
      q.resolve(res.rows.item(0).count);
    });

    return q.promise;
  };

  var getLastLesson = function () {
    return getLesson(-1);
  };

  var getAllLessons = function () {
    return getLesson(Infinity);
  };

  var getVerboseLessonsBetween = function (date1, date2) {

    // select lessons data
    var query = [];
    query.push('SELECT start_time AS start, end_time AS end, type, event FROM lesson');
    query.push('WHERE end_time IS NOT NULL');
    query.push('AND start_time BETWEEN ? AND ?');
    query.push('ORDER BY start_time DESC');

    var res = {};

    return execSQL(query.join(' '), [date1, date2])
      .then(function (lessons) {
        // fill result
        for (var i = 0; i < lessons.rows.length; i++) {
          var l = lessons.rows.item(i);
          res[l.start] = {
            start: l.start,
            end: l.end,
            type: l.type,
            event: l.event,
            score: []
          };
        }

        // select score for ALL lessons
        query.length = 0;
        query.push('SELECT start_time AS start, time, type, score FROM score');
        query.push('WHERE start_time BETWEEN ? AND ?');
        return execSQL(query.join(' '), [date1, date2]);
      })
      .then(function (scores) {
        // fill result scores for ALL selected lessons
        for (var i = 0; i < scores.rows.length; i++) {
          var s = scores.rows.item(i);
          res[s.start].score.push({
            time: s.time,
            score: s.score,
            type: s.type
          });
        }

        // return result without lesson keys (only lesson objects)
        return Object.keys(res).map(function (key) {
          return res[key];
        });
      });
  };

  var getLessonsBetween = function (date1, date2) {
    var q = $q.defer();

    var query = _getLessonsQuery();
    query.splice(-1, 0, 'WHERE end_time IS NOT NULL');
    query.splice(-1, 0, 'AND start_time BETWEEN ? AND ?');
    query.push('ORDER BY start_time DESC');

    execSQL(query.join(' '), [date1, date2]).then(function (res) {
      var ret = [];
      for (var i = 0; i < res.rows.length; i++) ret.push(res.rows.item(i));
      q.resolve(ret);
    });

    return q.promise;
  };

  var getLesson = function (start) {
    var q = $q.defer();

    var query = _getLessonsQuery();
    var callback;
    var inject = [];

    if (start == -1) { // last lesson
      query.push('ORDER BY start_time DESC LIMIT 1');
      callback = function (res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no current/last lesson found');
        }
      };

    } else if (start == Infinity) { // all lessons
      query.splice(-1, 0, 'WHERE end_time IS NOT NULL');
      query.push('ORDER BY start_time DESC');
      callback = function (res) {
        var ret = [];
        for (var i = 0; i < res.rows.length; i++) ret.push(res.rows.item(i));
        q.resolve(ret);
      };

    } else { // one lesson
      query.splice(-1, 0, 'WHERE start_time = ?');
      query.push('LIMIT 1');
      inject.push(start);
      callback = function (res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no lesson with start time ' + start + ' found');
        }
      };
    }

    execSQL(query.join(' '), inject).then(callback);

    return q.promise;
  };

  var getLessonDiffData = function (start, interval) {
    var q = $q.defer();
    interval = Math.round(interval);

    // sum all score types together (select lesson data grouped to N-seconds intervals)
    var query = [];
    query.push('SELECT end_time AS end, start_time AS start, -1 as diffGroup, type, 0 AS score FROM lesson WHERE start_time = ?'); // select lesson start + end time + type
    query.push('UNION');
    query.push('SELECT 0, start_time, ((time - start_time) / ' + interval + ') AS diff_group, type, MAX(score)'); // do NOT bind interval using "?" - problem with data types
    query.push('FROM score WHERE start_time = ? GROUP BY type, diff_group ORDER BY diff_group ASC');

    execSQL(query.join(' '), [start, start]).then(function (res) {
      // lesson times are in the first row
      var start = res.rows.item(0).start;
      var end = res.rows.item(0).end;

      // TODO use `scoreTypes`
      var lastScore = {
        1: 0,
        2: 0,
        3: 0
      };

      var ret = [];
      var rowNum = 1;
      var diffScore = 0;

      // generate diff groups (for all intervals between start and end time)
      for (var relativeTime = start; relativeTime <= end; relativeTime += interval) {
        var currentDiffGroup = (relativeTime - start) / interval;

        // while we have next rows and currently iterated row belongs to same diff group
        while (rowNum < res.rows.length && currentDiffGroup == res.rows.item(rowNum).diffGroup) {
          var row = res.rows.item(rowNum);
          diffScore += row.score - lastScore[row.type];
          lastScore[row.type] = row.score;
          rowNum++;
        }

        ret.push(diffScore);
        diffScore = 0;
      }

      q.resolve(ret);

    });

    return q.promise;
  };

  var setDeviceID = function (id) {
    $localStorage.deviceID = id;
  };

  var getDeviceID = function () {
    return $localStorage.deviceID;
  };

  var getPairedID = function () {
    return $localStorage.pairedID;
  };

  var setPairedID = function (id) {
    $localStorage.pairedID = id;
  };

  var isPaired = function () {
    return $localStorage.pairedID;
  };

  var ignore = function (deviceID) {
    if (!isIgnored(deviceID)) {
      $localStorage.ignoredIDs.push(deviceID);
    }
  };

  var isIgnored = function (deviceID) {
    return $localStorage.ignoredIDs.indexOf(deviceID) != -1;
  };

  var clearIgnored = function () {
    $localStorage.ignoredIDs = [];
  };

  var getUser = function () {
    return $localStorage.user;
  };

  var setToken = function (provider, token, expiresAt) {
    getUser().provider[provider].token = token;
    getUser().provider[provider].expiresAt = expiresAt;
  };

  var isLoggedIn = function () {
    return getUser().provider.jumping.token != null;
  };

  var getFriends = function () {
    return $localStorage.friends;
  };

  var getUserChanges = function () {
    return $localStorage.userChanges;
  };

  var getNewLessons = function () {
    return $localStorage.newLessons;
  };

  var getDeletedLessons = function () {
    return $localStorage.deletedLessons;
  };

  var getLessonLastSync = function () {
    return $localStorage.lessonLastSync;
  };

  var touchLessonLastSync = function () {
    $localStorage.lessonLastSync = Date.now();
  };

  // sqlite related service API
  this.prepareDB = prepareDB;
  this._dumpDB = _dumpDB;
  this.startLesson = startLesson;
  this.addScore = addScore;
  this.endLesson = endLesson;
  this.addLesson = addLesson;
  this.deleteLesson = deleteLesson;
  this.getLessonCount = getLessonCount;
  this.getCurrentLesson = getCurrentLesson;
  this.getLastLesson = getLastLesson;
  this.getAllLessons = getAllLessons;
  this.getLessonsBetween = getLessonsBetween;
  this.getVerboseLessonsBetween = getVerboseLessonsBetween;
  this.getLesson = getLesson;
  this.getLessonDiffData = getLessonDiffData;

  // local storage related service API
  this.setDeviceID = setDeviceID;
  this.getDeviceID = getDeviceID;
  this.setPairedID = setPairedID;
  this.getPairedID = getPairedID;
  this.isPaired = isPaired;
  this.ignore = ignore;
  this.isIgnored = isIgnored;
  this.clearIgnored = clearIgnored;
  this.getUser = getUser;
  this.setToken = setToken;
  this.isLoggedIn = isLoggedIn;
  this.getFriends = getFriends;
  this.getUserChanges = getUserChanges;
  this.getDeletedLessons = getDeletedLessons;
  this.getNewLessons = getNewLessons;
  this.getLessonLastSync = getLessonLastSync;
  this.touchLessonLastSync = touchLessonLastSync;
});
