'use strict';

angular.module('experience.services.store', [
  'ngCordova',
  'ngStorage',
])

.constant('scoreTypes', {
  amplitude: 1,
  rhythm: 2,
  frequency: 3,
})

.service('storeService', function ($cordovaSQLite, $localStorage, $q, $log, scoreTypes) {

  // prepare default (empty) lesson object
  var emptyLesson = {
    startTime: null,
    score: {},
  };
  angular.forEach(scoreTypes, function (value, key) {
    emptyLesson.score[value] = 0;
  });

  $localStorage.$default({
    deviceID: null,
  });
  $localStorage.$default({
    pairedID: null,
  });
  $localStorage.$default({
    ignoredIDs: [],
  });
  $localStorage.$default({
    user: {
      provider: null,
      accessToken: null,
      expiresIn: null,

      email: null,
      password: null,
      name: null,
      weight: null,
      age: null,
      gender: null,
      units: null,

      friends: {
        loaded: {
          // mktime
          facebook: null,
          google: null,
        },
        facebook: [],
        google: [],
      },
    },
  });
  $localStorage.$default({
    currentLesson: emptyLesson,
  });

  var db;

  var getDB = function () {
    if (db) {
      return db;
    }

    // TODO handle version number mismatch

    if (window.sqlitePlugin) { // native sqlite DB
      db = $cordovaSQLite.openDB({
        name: 'store.sqlite',
        bgType: true,
        version: '0.4.1',
      });

    } else { // fallback to websql
      db = window.openDatabase('store', '0.4.1', null, 2 * 1024 * 1024);
    }

    createSchema(db);
    return db;
  };

  var prepareDB = function () {
    getDB();
  };

  var createSchema = function (db) {
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS lesson (start_time DATETIME PRIMARY KEY, end_time DATETIME)');
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS score (start_time DATETIME NOT NULL, time DATETIME PRIMARY KEY, score FLOAT NOT NULL, type TINYINT)');
  };

  var _dumpDB = function () {

    return $cordovaSQLite.execute(getDB(), 'SELECT * FROM lesson', []).then(function (lesson) {
      var res = {
        lesson: [],
        score: [],
      };

      for (var i = 0; i < lesson.rows.length; i++) res.lesson.push(lesson.rows.item(i));

      $cordovaSQLite.execute(getDB(), 'SELECT * FROM score', []).then(function (score) {
        for (var i = 0; i < score.rows.length; i++) res.score.push(score.rows.item(i));

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('POST', 'http://experience.tbedrich.cz/api/v1/log');
        xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xmlhttp.send(angular.toJson(res));
        $log.info('Database dumped to remote server.');
      });
    });
  };

  var startLesson = function () {
    var startTime = Date.now();
    var query = 'INSERT INTO lesson (start_time) VALUES (?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime]).then(function () {
      $localStorage.currentLesson.startTime = startTime;
    });
  };

  var addScore = function (score, type) {
    var startTime = $localStorage.currentLesson.startTime;
    var time = Date.now();
    var query = 'INSERT INTO score (start_time, time, score, type) VALUES (?, ?, ?, ?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime, time, score, type]).then(function () {
      $localStorage.currentLesson.score[type] = score;
    });
  };

  var endLesson = function () {
    var endTime = Date.now();
    var startTime = $localStorage.currentLesson.startTime;
    var query = 'UPDATE lesson SET end_time = ? WHERE start_time = ?';
    return $cordovaSQLite.execute(getDB(), query, [endTime, startTime]).then(function () {
      angular.copy(emptyLesson, $localStorage.currentLesson);
    });
  };

  var getCurrentLesson = function () {
    return $localStorage.currentLesson;
  };

  var _getLessonsQuery = function () {
    var query = [];
    query.push('SELECT start_time AS startTime, end_time AS endTime, duration, COALESCE(SUM(score), 0) AS score FROM');
    query.push('  (SELECT l.*, (end_time - l.start_time) AS duration, MAX(s.score) AS score, s.type FROM lesson l LEFT JOIN score s ON l.start_time = s.start_time GROUP BY l.start_time, s.type)');
    query.push('GROUP BY start_time');
    return query;
  };

  var getLastLesson = function () {
    return getLesson(-1);
  };

  var getAllLessons = function () {
    return getLesson(Infinity);
  };

  var getLessonsBetween = function (date1, date2) {
    var q = $q.defer();

    var query = _getLessonsQuery();
    query.splice(-1, 0, 'WHERE end_time IS NOT NULL');
    query.splice(-1, 0, 'AND start_time BETWEEN ? AND ?');
    query.push('ORDER BY start_time DESC');

    $cordovaSQLite.execute(getDB(), query.join(' '), [date1, date2]).then(function (res) {
      var ret = [];
      for (var i = 0; i < res.rows.length; i++) ret.push(res.rows.item(i));
      q.resolve(ret);
    }).catch(function (err) {
      $log.error('getting lesson failed:', err.message, 'in query', query.join(' '));
      q.reject(err);
    });

    return q.promise;
  };

  var getLesson = function (startTime) {
    var q = $q.defer();

    var query = _getLessonsQuery();
    var callback;
    var inject = [];

    if (startTime == -1) { // last lesson
      query.push('ORDER BY start_time DESC LIMIT 1');
      callback = function (res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no current/last lesson found');
        }
      };

    } else if (startTime == Infinity) { // all lessons
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
      inject.push(startTime);
      callback = function (res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no lesson with start time ' + startTime + ' found');
        }
      };
    }

    $cordovaSQLite.execute(getDB(), query.join(' '), inject).then(callback).catch(function (err) {
      $log.error('getting lesson failed:', err.message, 'in query', query.join(' '));
      q.reject(err);
    });

    return q.promise;
  };

  var getLessonDiffData = function (startTime, interval) {
    var q = $q.defer();
    interval = Math.round(interval);

    // sum all score types together (select lesson data grouped to N-seconds intervals)
    var query = [];
    query.push('SELECT end_time AS endTime, start_time AS startTime, -1 as diffGroup, 0 as type, 0 as score FROM lesson WHERE start_time = ?'); // select lesson start + end time
    query.push('UNION');
    query.push('SELECT 0, start_time, ((time - start_time) / ' + interval + ') AS diff_group, type, MAX(score)'); // do NOT bind interval using "?" - problem with data types
    query.push('FROM score WHERE start_time = ? GROUP BY type, diff_group ORDER BY diff_group ASC');

    $cordovaSQLite.execute(getDB(), query.join(' '), [startTime, startTime]).then(function (res) {
      // lesson times are in the first row
      var startTime = res.rows.item(0).startTime;
      var endTime = res.rows.item(0).endTime;

      // TODO use `scoreTypes`
      var lastScore = {
        1: 0,
        2: 0,
        3: 0,
      };

      var ret = [];
      var rowNum = 1;
      var diffScore = 0;

      // generate diff groups (for all intervals between start and end time)
      for (var relativeTime = startTime; relativeTime <= endTime; relativeTime += interval) {
        var currentDiffGroup = (relativeTime - startTime) / interval;

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

    }).catch(function (err) {
      $log.error('getting lesson diff data failed:', err.message, ', query', query.join(' '));
      q.reject(err);
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

  var isLoggedIn = function () {
    return getUser().provider != null;
  };

  // sqlite related service API
  this.prepareDB = prepareDB;
  this._dumpDB = _dumpDB;
  this.startLesson = startLesson;
  this.addScore = addScore;
  this.endLesson = endLesson;
  this.getCurrentLesson = getCurrentLesson;
  this.getLastLesson = getLastLesson;
  this.getAllLessons = getAllLessons;
  this.getLessonsBetween = getLessonsBetween;
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
  this.isLoggedIn = isLoggedIn;

});
