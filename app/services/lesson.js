'use strict';

var module = angular.module('fxe.services.lesson', []);

module.constant('sports', {
  jumping: 1,
  running: 2
});

module.service('lessonService', function ($ionicPlatform, $cordovaSQLite, $localStorage, $q, $log) {

  var $storage = $localStorage.$default({
    deletedLessons: [],
    newLessons: []
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
          db = window.openDatabase('store', '', '', 2 * 1024 * 1024);
        }

        createSchema(db);
        return db;
      });
  };

  var execSQL = function (query, bindings) {
    return _getDB().then(function (db) {
      return $cordovaSQLite.execute(db, query, bindings)
        .catch(function (error) {
          $log.error('SQL query "' + query + '" failed', error);
          throw error;
        });
    });
  };

  var prepareDB = function () {
    _getDB();
  };

  var createSchema = function (db) {
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS lesson (start_time DATETIME PRIMARY KEY, end_time DATETIME, type TINYINT NOT NULL, event INT);');
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS score (start_time DATETIME NOT NULL, time DATETIME, score FLOAT NOT NULL, type TINYINT, PRIMARY KEY (start_time, time));');
  };

  var addLesson = function (lesson, dbOnly) {
    var queries = [];
    var bindings = [];

    // insert lesson
    queries.push('INSERT INTO lesson (start_time, end_time, type, event) VALUES (?, ?, ?, ?);');
    bindings.push([lesson.start, lesson.end, lesson.sport, 'event' in lesson ? lesson.event : null]);

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

      // add to main query queue
      queries.push(q.join(' '));
      bindings.push(b);
    }

    // run all queries parallely
    queries = queries.map(function (query, i) {
      return execSQL(query, bindings[i]);
    });

    // wait for all queries to finish
    return $q.all(queries)
      .then(function () {
        // if not dbOnly, then also add to addedLessons array
        if (dbOnly !== true) $storage.newLessons.push(lesson.start);
      });
  };

  var deleteLesson = function (start, dbOnly) {
    // Sqlite BUG: cannot bind multiple statements per query => run 2 queries
    var query = 'DELETE FROM lesson WHERE start_time = ?;';
    var bind = [start];
    return execSQL(query, bind)
      .then(function () {
        query = 'DELETE FROM score WHERE start_time = ?;';
        return execSQL(query, bind);
      })
      .then(function () {
        // if not dbOnly, then also add to deletedLessons array
        if (dbOnly !== true) $storage.deletedLessons.push(start);
      });
  };

  var getLessonCount = function () {
    var query = 'SELECT COUNT(1) as count FROM lesson';
    var bind = [];

    return execSQL(query, bind).then(function (res) {
      return res.rows.item(0).count;
    });
  };

  var getScore = function (start) {
    var query = 'SELECT time, type, score FROM score WHERE start_time = ?';
    var bind = [start];
    return execSQL(query, bind).then(function (res) {
      var score = [];
      for (var i = 0; i < res.rows.length; i++) score.push(res.rows.item(i));
      return score;
    });
  };

  var getLesson = function (start, withCompleteScore) {
    var lesson;

    // default value
    if (withCompleteScore !== true) withCompleteScore = false;

    var query = 'SELECT l.start_time, l.end_time, l.type, l.event, MAX(s.score) AS score FROM lesson l ' +
      'LEFT JOIN score s ON l.start_time = s.start_time GROUP BY l.start_time, s.type HAVING l.start_time = ?;';
    var bind = [start];
    return execSQL(query, bind).then(function (res) {
      if (res.rows.length == 0) {
        throw 'no lesson with start time ' + start + ' found';
      }

      var row = res.rows.item(0);
      lesson = {
        start: row.start_time,
        end: row.end_time,
        sport: row.type,
        event: row.event
      };

      // add derived duration
       lesson.duration = row.end_time - row.start_time;

      getScore(start).then(function (score) {
            var s = (score[score.length - 1].time - score[0].time);

            var ms = s % 1000;
            s = (s - ms) / 1000;
            var secs = s % 60;
            s = (s - secs) / 60;
            var mins = s % 60;
            var hrs = (s - mins) / 60;

            if (hrs === 0)
              hrs = "00";

            if (mins === 0)
                mins = "00";

            if (secs === 0)
                secs = "00";

            lesson.duration_real  = hrs + ':' + mins + ':' + secs ;
      });

      if (withCompleteScore) {
        // select complete score if required
        return getScore(start).then(function (score) {
          lesson.score = score;
          return lesson;
        });

      } else {
        // otherwise, only sum rows in current result
        lesson.score = 0;
        for (var i = 0; i < res.rows.length; i++) lesson.score += res.rows.item(i).score;
        return lesson;
      }
    });
  };

  var getLessonsBetween = function (date1, date2) {
    var query = 'SELECT start_time AS start FROM lesson WHERE end_time IS NOT NULL AND start_time BETWEEN ? AND ? ORDER BY start_time DESC;';
    var bind = [date1, date2];
    return execSQL(query, bind)
      .then(function (res) {
        // collect lesson IDs
        var starts = [];
        for (var i = 0; i < res.rows.length; i++) starts.push(res.rows.item(i).start);

        // get lessons
        return $q.all(starts.map(getLesson));
      });
  };

  var getLessonDiffData = function (start, interval) {
    var end;
    interval = Math.round(interval);

    return getLesson(start, false)
      .then(function (lesson) {
        // we only need lesson end time
        end = lesson.end;

        // sum all score types together (select score items grouped to N-seconds intervals)
        var query = [];
        query.push('SELECT ((time - start_time) / ' + interval + ') AS diff_group, type, MAX(score) AS score'); // do NOT bind interval using "?" - problem with data types
        query.push('FROM score WHERE start_time = ? GROUP BY type, diff_group ORDER BY diff_group ASC');
        var bind = [start];
        return execSQL(query.join(' '), bind);
      })
      .then(function (res) {
        var lastScore = {};
        var ret = [];
        var rowNum = 0;
        var diffScore = 0;

        // generate diff groups (for all intervals between start and end time)
        for (var relativeTime = start; relativeTime <= end; relativeTime += interval) {
          var currentDiffGroup = (relativeTime - start) / interval;

          // while we have next rows and currently iterated row belongs to same diff group
          while (rowNum < res.rows.length && currentDiffGroup == res.rows.item(rowNum).diff_group) {
            var row = res.rows.item(rowNum);
            diffScore += row.score - (lastScore[row.type] || 0);
            lastScore[row.type] = row.score;
            rowNum++;
          }

          ret.push(diffScore);
          diffScore = 0;
        }

        return ret;
      });
  };

  var getNewLessons = function () {
    return $storage.newLessons;
  };

  var getDeletedLessons = function () {
    return $storage.deletedLessons;
  };

  this.prepareDB = prepareDB;
  this.addLesson = addLesson;
  this.deleteLesson = deleteLesson;
  this.getLessonCount = getLessonCount;
  this.getLessonsBetween = getLessonsBetween;
  this.getLesson = getLesson;
  this.getScore = getScore;
  this.getLessonDiffData = getLessonDiffData;
  this.getDeletedLessons = getDeletedLessons;
  this.getNewLessons = getNewLessons;
});
