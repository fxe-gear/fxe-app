'use strict';

angular.module('experience.services.store', [
  'ngCordova',
  'ngStorage',
])

.service('storeService', function($cordovaSQLite, $localStorage, $q, $log) {

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
      provider: '',
      accessToken: '',
      expiresIn: '',

      email: '',
      password: '',
      name: '',
      weight: 0,
      birthday: '',
      gender: '',
      units: '',
    },
  });

  var db;

  var getDB = function() {
    if (!db) {
      if (window.sqlitePlugin) { // native sqlite DB
        db = $cordovaSQLite.openDB({
          name: 'store.sqlite',
          bgType: true,
          version: '0.2.0',
        });
      } else { // fallback to websql
        db = window.openDatabase('store', '0.2.0', null, 2 * 1024 * 1024);
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

  var addLesson = function(startTime) {
    var query = 'INSERT INTO lesson (start_time) VALUES (?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime]);
  };

  var addScore = function(startTime, time, score, type) {
    var query = 'INSERT INTO score (start_time, time, score, type) VALUES (?, ?, ?, ?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime, time, score, type]);
  };

  var setLessonStopTime = function(startTime, endTime) {
    var query = 'UPDATE lesson SET end_time = ? WHERE start_time = ?';
    return $cordovaSQLite.execute(getDB(), query, [endTime, startTime]);
  };

  var getLastLesson = function() {
    return getLesson(0);
  };

  var getAllLessons = function() {
    return getLesson(-1);
  };

  var getLesson = function(startTime) {
    var q = $q.defer();

    var query = 'SELECT ' +
      'start_time AS startTime, ' +
      'end_time AS endTime, ' +
      '(end_time - start_time) AS duration, ' +
      'COALESCE((SELECT SUM(score) FROM score WHERE score.start_time = lesson.start_time GROUP BY start_time), 0) AS score ' +
      'FROM lesson';
    var callback;
    var inject = [];

    if (startTime == 0) { // last lesson
      query += ' ORDER BY start_time DESC LIMIT 1';
      callback = function(res) {
        if (res.rows.length > 0) {
          q.resolve(res.rows.item(0));
        } else {
          q.reject('no last lesson found');
        }
      };

    } else if (startTime == -1) { // all lessons
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
    var query = 'SELECT SUM(score) AS score, (time - start_time) AS relativeTime, ((time - start_time) / ?) AS diffGroup ' + 'FROM score WHERE start_time = ? GROUP BY diffGroup ORDER BY relativeTime ASC';
    $cordovaSQLite.execute(getDB(), query, [interval * 1000, startTime]).then(function(res) {

      var ret = [];
      var prevDiffGroup = -1;

      for (var i = 0; i < res.rows.length; i++) {
        var row = res.rows.item(i);
        for (var j = prevDiffGroup + 1; j < row.diffGroup; j++) {
          // we have to add missing diffGroups with zeroes! (with no score)
          ret.push(0);
        }

        ret.push(row.score);
        prevDiffGroup = row.diffGroup;
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
    return getUser().provider != '';
  };

  // sqlite related service API
  this.prepareDB = prepareDB;
  this.addLesson = addLesson;
  this.addScore = addScore;
  this.setLessonStopTime = setLessonStopTime;
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
