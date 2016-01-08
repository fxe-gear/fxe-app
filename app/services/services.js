'use strict';

angular.module('experience.services', [
  'ngCordova',
  // 'ngCordovaMocks',
  'ngStorage',
])

.filter('msToTimeSpan', function() {
  return function(ms) {
    return new Date(1970, 0, 1).setSeconds(0, ms);
  };
})

// ------------------------------------------------------------------------------------------------

.service('util', function() {
  // Fisher–Yates shuffle
  this.shuffle = function(array) {
    var counter = array.length;
    var temp;
    var index;

    while (counter > 0) {
      index = Math.floor(Math.random() * counter);
      counter--;
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }

    return array;
  };
})

// ------------------------------------------------------------------------------------------------

.service('userService', function($rootScope, $localStorage, $http, $log, $cordovaFacebook, $q) {

  $localStorage.$default({
    userService: {
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
  var model = $localStorage.userService;

  var loginFacebook = function() {
    return $cordovaFacebook.login(['email', 'public_profile', 'user_birthday', 'user_friends'])
    .then(function(response) {
      model.provider = 'facebook';
      model.accessToken = response.authResponse.accessToken;
      model.expiresIn = response.authResponse.expiresIn;
      $log.info('logged in using Facebook');
    });
  };

  var loginGoogle = function() {
    var q = $q.defer();
    window.plugins.googleplus.login({offline: true}, function(response) {
      model.provider = 'google';
      model.accessToken = response.oauthToken;
      model.expiresIn = 0;

      model.email = response.email;
      model.name = response.displayName;

      if (response.gender) model.gender = response.gender; // Android only
      if (response.birthday) model.birthday = response.birthday; // Android only

      $log.info('logged in using Google');
      q.resolve(response);
    }, q.reject);
    return q.promise;
  };

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

  var loadFromFacebook = function() {
    return $http.get('https://graph.facebook.com/v2.5/me', {
      params: {
        // TODO handle token expiration
        access_token: model.accessToken,
        fields: 'email,name,birthday,gender,locale',
      },
    }).then(function(response) {
      model.email = response.data.email;
      model.name = response.data.name;
      model.gender = response.data.gender;
      model.birthday = response.data.birthday;
      model.units = response.data.locale == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Facebook');
    }).catch(function(error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
    });
  };

  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  var loadFromGoogle = function() {
    return $http.get('https://www.googleapis.com/plus/v1/people/me', {
      params: {
        fields: 'emails,displayName,birthday,gender,language',
      },
      headers: {
        Authorization: 'Bearer ' + model.accessToken,
      },
    }).then(function(response) {
      model.units = response.language == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Google');
    }).catch(function(error) {
      $log.error('Google API error: ' + error);
      throw error;
    });
  };

  var isLoggedIn = function() {
    return model.provider != '';
  };

  // service public API
  this.model = model;
  this.isLoggedIn = isLoggedIn;
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loadFromFacebook = loadFromFacebook;
  this.loadFromGoogle = loadFromGoogle;
})

// ------------------------------------------------------------------------------------------------

// thin wrapper on the top of SQL storage providing JS API to persistent data
.service('storeService', function($cordovaSQLite, $localStorage, $q, $log) {

  $localStorage.$default({deviceID: null});
  $localStorage.$default({pairedID: null});
  $localStorage.$default({ignoredIDs: []});

  var db;

  var getDB = function() {
    // $cordovaSQLite.deleteDB({name: 'store.sqlite'}); // run after schema change
    if (!db) {
      db = $cordovaSQLite.openDB({name: 'store.sqlite', bgType: true, version: '0.1.0'});
      createSchema(db);
    }

    return db;
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

  var getLessonDuration = function(startTime) {
    var q = $q.defer();

    var query = 'SELECT (end_time - start_time) AS duration FROM lesson WHERE start_time = ?';
    $cordovaSQLite.execute(getDB(), query, [startTime]).then(function(res) {
      q.resolve((res.rows.length > 0) ? res.rows.item(0).duration : 0);
    }).catch(function(err) {
      $log.error('DB select failed');
      q.reject(err);
    });

    return q.promise;
  };

  var getLessonCumulativeScore = function(startTime) {
    var q = $q.defer();

    var query = 'SELECT score FROM score WHERE start_time = ? ORDER BY time DESC LIMIT 1';
    $cordovaSQLite.execute(getDB(), query, [startTime]).then(function(res) {
      q.resolve((res.rows.length > 0) ? res.rows.item(0).score : 0);
    }).catch(function(err) {
      $log.error('getting lesson cumulative score failed');
      q.reject(err);
    });

    return q.promise;
  };

  var getLastLessonStartTime = function() {
    var q = $q.defer();

    var query = 'SELECT start_time AS startTime FROM lesson ORDER BY start_time DESC LIMIT 1';
    $cordovaSQLite.execute(getDB(), query).then(function(res) {
      q.resolve((res.rows.length > 0) ? res.rows.item(0).startTime : 0);
    }).catch(function(err) {
      $log.error('getting last lesson start time failed');
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

  // sqlite related service API
  this.addLesson = addLesson;
  this.addScore = addScore;
  this.setLessonStopTime = setLessonStopTime;
  this.getLessonDuration = getLessonDuration;
  this.getLessonCumulativeScore = getLessonCumulativeScore;
  this.getLastLessonStartTime = getLastLessonStartTime;

  // local storage related service API
  this.setDeviceID = setDeviceID;
  this.getDeviceID = getDeviceID;
  this.setPairedID = setPairedID;
  this.getPairedID = getPairedID;
  this.isPaired = isPaired;
  this.ignore = ignore;
  this.isIgnored = isIgnored;
  this.clearIgnored = clearIgnored;

})

// ------------------------------------------------------------------------------------------------

.constant('peripheralServices', {
  experience: {
    uuid: '6b00',
    characteristics: {
      control: {uuid: '6bff'},
      amplitude: {uuid: '6b04'},
      rhythm: {uuid: '6b05'},
      frequency: {uuid: '6b06'},
    },
  },
  led: {
    uuid: '6c00',
    characteristics: {
      led: {uuid: '6c01'},
    },
  },
})

.service('experienceService', function($rootScope, $cordovaBLE, $q, $log, storeService, peripheralServices) {
  var ps = peripheralServices;

  var connected = false;
  var scanning = false;
  var score = {
    amplitude: 0,
    rhythm: 0,
    frequency: 0,
  };
  var startTime = null;
  var stopTime = null;

  var enable = function() {
    var q = $q.defer();

    // TODO horrible hack
    function checkBle() {
      if (typeof ble === 'undefined') {
        window.setTimeout(checkBle, 100);
      } else {
        $cordovaBLE.isEnabled().then(function() {  // already enabled
          q.resolve();
        }).catch(function(error) { // not enabled
          if (typeof ble.enable === 'undefined') {
            // iOS doesn't have ble.enable
            q.reject('cannot enable bluetooth, probably on iOS');
          } else {
            // Android
            $log.debug('enabling bluetooth');
            $cordovaBLE.enable().then(function() {
              $log.info('bluetooth enabled');
              q.resolve();
            }).catch(function(error) {
              $log.warning('bluetooth not enabled');
              q.reject(error);
            });
          }
        });
      }
    }

    checkBle();

    return q.promise;
  };

  var scan = function() {
    var q = $q.defer();
    $log.debug('starting ble scan');
    scanning = true;

    $cordovaBLE.startScan([ps.experience.uuid], function(device) {
      var deviceID = device.id;
      if (storeService.isPaired()) { // paired
        if (storeService.getPairedID() == deviceID) { // found paired device
          $log.info('found paired ' + deviceID);
          stopScan().then(function() { q.resolve(deviceID); });
        } else { // found another (not paired) device
          $log.info('found not paired ' + deviceID);
        }

      } else { // not paired yet
        if (!storeService.isIgnored(deviceID)) { // found new (not ignored) device
          $log.info('found ' + deviceID);
          stopScan().then(function() { q.resolve(deviceID); });
        } else { // found ignored
          $log.info('found ignored ' + deviceID);
          q.notify(deviceID);
        }
      }
    }, q.reject);

    $log.info('scanning started');
    return q.promise;
  };

  var stopScan = function() {
    if (!scanning) return $q.resolve();
    $log.debug('stopping ble scan');
    return $cordovaBLE.stopScan().then(function(result) {
      $log.info('scanning stopped');
      scanning = false;
      return result;
    }).catch(function(error) {
      $log.error('scanning stop failed');
      throw error;
    });
  };

  var connect = function(deviceID) {
    $log.debug('connecting to ' + deviceID);
    return $cordovaBLE.connect(deviceID).then(function(device) {
      $log.info('connected to ' + deviceID);
      connected = true;
      storeService.setDeviceID(deviceID);
      return deviceID;
    }).catch(function(error) {
      $log.error('connecting to ' + deviceID + ' failed');
      throw error;
    });
  };

  var reconnect = function() {
    if (!storeService.isPaired()) return $q.reject('unable to reconnect, no device is paired');
    if (connected) return $q.resolve();
    return scan().then(connect);
  };

  var disconnect = function() {
    if (!connected) return $q.resolve();
    $log.debug('disconnecting from ' + storeService.getDeviceID());

    return $cordovaBLE.disconnect(storeService.getDeviceID()).then(function(result) {
      $log.info('disconnected from ' + storeService.getDeviceID());
      connected = false;
      return result;
    }).catch(function(error) {
      $log.error('disconnecting from ' + deviceID + ' failed');
      throw error;
    });
  };

  var ignore = function() {
    if (!storeService.getDeviceID()) return;
    storeService.ignore(storeService.getDeviceID());
    $log.info(storeService.getDeviceID() + ' added to ignore list');
  };

  var clearIgnored = function() {
    storeService.clearIgnored();
  };

  var setColor = function(color) {
    if (!connected) return $q.resolve();
    $log.debug('setting color to ' + color);

    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue
    // TODO use reliable write - sometimes throws error number 133
    return $cordovaBLE.write(storeService.getDeviceID(), ps.led.uuid, ps.led.characteristics.led.uuid, data.buffer).then(function() {
      $log.info('color set to ' + color);
    }).catch(function(error) {
      $log.error('setting color failed');
      throw error;
    });
  };

  var clearColor = function() {
    return setColor('#000000');
  };

  var startMeasurement = function() {
    if (!connected) return $q.reject('experience not connected');
    $log.debug('starting measurement');
    var zeroScore = new Float32Array([0]);

    var scoreCallback = function(data) {
      // TODO separate different characteristic types
      score.amplitude = new Float32Array(data)[0];
      storeService.addScore(startTime, Date.now(), getCumulativeScore(), null);
    };

    // delete previous scores
    score.amplitude = 0;
    return $cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.amplitude.uuid, zeroScore.buffer)
    .then($cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.rhythm.uuid, zeroScore.buffer))
    .then($cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.frequency.uuid, zeroScore.buffer))

    // register callbacks
    .then(function() {
      $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.amplitude.uuid, scoreCallback);
      $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.rhythm.uuid, scoreCallback);
      $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.frequency.uuid, scoreCallback);
    })

    // start measurement
    .then($cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, new Uint8Array([0x1]).buffer))
    .then(function() {
      startTime = Date.now();
      stopTime = null;
      storeService.addLesson(startTime);
      $log.info('measurement started');
    })
    .catch(function(error) {
      $log.error('starting measurement failed');
      throw error;
    });
  };

  var stopMeasurement = function() {
    if (!connected) return $q.reject('experience not connected');
    $log.debug('stopping measurement');

    // stop measurement
    return $cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, new Uint8Array([0xff]).buffer)

    // unregister callbacks
    .then($cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.amplitude.uuid))
    .then($cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.rhythm.uuid))
    .then($cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.frequency.uuid))

    .then(function() {
      stopTime = Date.now();
      storeService.setLessonStopTime(startTime, stopTime);
      $log.info('measurement stopped');
    })

    .catch(function(error) {
      $log.error('stopping measurement failed');
      throw error;
    });
  };

  var sendCommand = function(cmd) {
    if (!connected) return $q.reject('experience not connected');
    $log.debug('sending command ' + cmd);
    var data = new Uint8Array([cmd]).buffer;
    return $cordovaBLE.writeWithoutResponse(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, data)
    .then(function() {
      $log.info('command ' + cmd + ' sent');
    }).catch(function(error) {
      $log.error('sending command failed');
      throw error;
    });
  };

  var getElapsedTime = function() {
    // return elapsed time from start of measurement (in milliseconds)
    return startTime != null ? (stopTime != null ? stopTime : Date.now()) - startTime : 0;
  };

  var pair = function() {
    $log.info('device ' + storeService.getDeviceID() + ' paired');
    storeService.setPairedID(storeService.getDeviceID());
  };

  var isConnected = function() {
    return connected;
  };

  var getScore = function() {
    return score;
  };

  var getCumulativeScore = function() {
    var s = getScore();
    return s.amplitude + s.rhythm + s.frequency;
  };

  // service public API
  this.enable = enable;
  this.scan = scan;
  this.stopScan = stopScan;
  this.connect = connect;
  this.reconnect = reconnect;
  this.disconnect = disconnect;
  this.ignore = ignore;
  this.clearIgnored = clearIgnored;
  this.setColor = setColor;
  this.clearColor = clearColor;
  this.startMeasurement = startMeasurement;
  this.stopMeasurement = stopMeasurement;
  this.sendCommand = sendCommand;
  this.getElapsedTime = getElapsedTime;
  this.pair = pair;
  this.isConnected = isConnected;
  this.getScore = getScore;
  this.getCumulativeScore = getCumulativeScore;

})

;
