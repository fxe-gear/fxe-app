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

.service('storeService', function($cordovaSQLite, $localStorage, $q, $log, scoreTypes) {

  // prepare default (empty) lesson object
  var emptyLesson = {
    startTime: null,
    score: {},
  };
  angular.forEach(scoreTypes, function(value, key) {
    emptyLesson.score[key] = 0;
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
    },
  });
  $localStorage.$default({
    currentLesson: emptyLesson,
  });

  var db;

  var getDB = function() {
    if (!db) {
      if (window.sqlitePlugin) { // native sqlite DB
        db = $cordovaSQLite.openDB({
          name: 'store.sqlite',
          bgType: true,
          version: '0.3.0',
        });
      } else { // fallback to websql
        db = window.openDatabase('store', '0.3.0', null, 2 * 1024 * 1024);
      }

      createSchema(db);
    }

    return db;
  };

  var prepareDB = function() {
    getDB();
  };

  var createSchema = function(db) {
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS lesson (start_time DATETIME PRIMARY KEY, end_time DATETIME)');
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS score (start_time DATETIME NOT NULL, time DATETIME PRIMARY KEY, score FLOAT NOT NULL, type TINYINT)');
  };

  var startLesson = function() {
    var startTime = Date.now();
    var query = 'INSERT INTO lesson (start_time) VALUES (?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime]).then(function() {
      $localStorage.currentLesson.startTime = startTime;
    });
  };

  var addScore = function(score, type) {
    var startTime = $localStorage.currentLesson.startTime;
    var time = Date.now();
    var query = 'INSERT INTO score (start_time, time, score, type) VALUES (?, ?, ?, ?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime, time, score, type]).then(function() {
      $localStorage.currentLesson.score[type] = score;
    });
  };

  var endLesson = function() {
    var endTime = Date.now();
    var startTime = $localStorage.currentLesson.startTime;
    var query = 'UPDATE lesson SET end_time = ? WHERE start_time = ?';
    return $cordovaSQLite.execute(getDB(), query, [endTime, startTime]).then(function() {
      angular.copy(emptyLesson, $localStorage.currentLesson);
    });
  };

  var getCurrentLesson = function() {
    return $localStorage.currentLesson;
  };

  var getLastLesson = function() {
    return getLesson(-1);
  };

  var getAllLessons = function() {
    return getLesson(Infinity);
  };

  var getLesson = function(startTime) {
    var q = $q.defer();

    var query = 'SELECT ' +
      'start_time AS startTime, ' +
      'end_time AS endTime, ' +
      '(end_time - start_time) AS duration, ' +
      'COALESCE((SELECT MAX(score) FROM score WHERE score.start_time = lesson.start_time GROUP BY start_time), 0) AS score ' +
      'FROM lesson';
    var callback;
    var inject = [];

    if (startTime == -1) { // last lesson
      query += ' ORDER BY start_time DESC LIMIT 1';
      callback = function(res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no current/last lesson found');
        }
      };

    } else if (startTime == Infinity) { // all lessons
      query += ' ORDER BY start_time DESC';
      callback = function(res) {
        var ret = [];
        for (var i = 0; i < res.rows.length; i++) ret.push(res.rows.item(i));
        q.resolve(ret);
      };

    } else { // one lesson
      query += ' WHERE start_time = ? LIMIT 1';
      inject.push(startTime);
      callback = function(res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no lesson with start time ' + startTime + ' found');
        }
      };
    }

    $cordovaSQLite.execute(getDB(), query, inject).then(callback).catch(function(err) {
      $log.error('getting lesson failed');
      q.reject(err);
    });

    return q.promise;
  };

  var getLessonDiffData = function(startTime, interval) {
    var q = $q.defer();

    // select lesson data grouped to N-seconds intervals
    var query = 'SELECT ' +
      'MAX(score) AS score, ((time - start_time) / ?) AS diffGroup ' +
      'FROM score WHERE start_time = ? GROUP BY diffGroup ORDER BY diffGroup ASC';
    $cordovaSQLite.execute(getDB(), query, [interval * 1000, startTime]).then(function(res) {

      var ret = [];
      var prevDiffGroup = -1;
      var prevDiffGroupScore = 0;

      for (var i = 0; i < res.rows.length; i++) {
        var row = res.rows.item(i);

        // we have to add missing diffGroups with zeroes! (with no score)
        for (var j = prevDiffGroup + 1; j < row.diffGroup; j++) {
          ret.push(0);
        }

        ret.push(row.score - prevDiffGroupScore);
        prevDiffGroup = row.diffGroup;
        prevDiffGroupScore = row.score;
      }

      q.resolve(ret);
    }).catch(function(err) {
      $log.error('getting lesson diff data failed');
      q.reject(err);
    });

    return q.promise;
  };

  var setDeviceID = function(id) {
    $localStorage.deviceID = id;
  };

  var getDeviceID = function() {
    return $localStorage.deviceID;
  };

  var getPairedID = function() {
    return $localStorage.pairedID;
  };

  var setPairedID = function(id) {
    $localStorage.pairedID = id;
  };

  var isPaired = function() {
    return $localStorage.pairedID;
  };

  var ignore = function(deviceID) {
    if (!isIgnored(deviceID)) {
      $localStorage.ignoredIDs.push(deviceID);
    }
  };

  var isIgnored = function(deviceID) {
    return $localStorage.ignoredIDs.indexOf(deviceID) != -1;
  };

  var clearIgnored = function() {
    $localStorage.ignoredIDs = [];
  };

  var getUser = function() {
    return $localStorage.user;
  };

  var isLoggedIn = function() {
    return getUser().provider != null;
  };

  // sqlite related service API
  this.prepareDB = prepareDB;
  this.startLesson = startLesson;
  this.addScore = addScore;
  this.endLesson = endLesson;
  this.getCurrentLesson = getCurrentLesson;
  this.getLastLesson = getLastLesson;
  this.getAllLessons = getAllLessons;
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
