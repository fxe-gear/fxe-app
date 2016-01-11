'use strict';

angular.module('experience.services.experience', [
  'ngCordova',
  'ngWebSocket',
  'experience.services.store',
])

.constant('peripheralServices', {
  experience: {
    uuid: '6b00',
    characteristics: {
      extreme: {uuid: '6b01'},
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

.service('experienceService', function($rootScope, $cordovaBLE, $websocket, $q, $log, storeService, peripheralServices) {
  var ps = peripheralServices;

  var scanning = false;
  var score = {
    amplitude: 0,
    rhythm: 0,
    frequency: 0,
  };
  var lastScore = 0;
  var startTime = null;
  var stopTime = null;
  var websocket = null;

  var enable = function() {
    var q = $q.defer();

    try {
      ble.isEnabled;
    } catch (e) {
      $log.error('no ble, no fun');
      q.reject(e);
      return q.promise;
    }

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
          $log.warn('bluetooth not enabled');
          q.reject(error);
        });
      }
    });

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
      storeService.setDeviceID(deviceID);
      return deviceID;
    }).catch(function(error) {
      $log.error('connecting to ' + deviceID + ' failed');
      throw error;
    });
  };

  var reconnect = function() {
    if (!storeService.isPaired()) return $q.reject('unable to reconnect, no device is paired');
    return isConnected().then(function(connected) {
      if (connected) return;
      else return scan().then(connect).then(clearColor);
    });
  };

  var disconnect = function() {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';
      $log.debug('disconnecting from ' + storeService.getDeviceID());

      return $cordovaBLE.disconnect(storeService.getDeviceID()).then(function(result) {
        $log.info('disconnected from ' + storeService.getDeviceID());
        return result;
      }).catch(function(error) {
        $log.error('disconnecting from ' + deviceID + ' failed');
        throw error;
      });
    });
  };

  var ignore = function() {
    if (!storeService.getDeviceID()) return $q.reject('unable to ignore, no device is paired');
    storeService.ignore(storeService.getDeviceID());
    $log.info(storeService.getDeviceID() + ' added to ignore list');
    return $q.resolve();
  };

  var clearIgnored = function() {
    storeService.clearIgnored();
    return $q.resolve();
  };

  var setColor = function(color) {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';
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
    });
  };

  var clearColor = function() {
    return setColor('#000000');
  };

  var startMeasurement = function() {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';
      $log.debug('starting measurement');

      var zeroScore = new Float32Array([0]);

      var scoreCallback = function(data) {
        // TODO separate different characteristic types
        score.amplitude = new Float32Array(data)[0];
        storeService.addScore(startTime, Date.now(), score.amplitude - lastScore, null);
        lastScore = score.amplitude;
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
    });
  };

  var stopMeasurement = function() {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';
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
    });
  };

  var sendCommand = function(cmd) {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';
      $log.debug('sending command ' + cmd);

      var data = new Uint8Array([cmd]).buffer;
      return $cordovaBLE.writeWithoutResponse(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, data)
      .then(function() {
        $log.info('command ' + cmd + ' sent');
      }).catch(function(error) {
        $log.error('sending command failed');
        throw error;
      });
    });
  };

  var subscribeExtremes = function(websocketIP, websocketPort) {
    var q = $q.defer();

    isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';

      var address = 'ws://' + [websocketIP, websocketPort].join(':');
      $log.debug('subscribing extremes and streaming to ' + address);

      websocket = $websocket(address);
      websocket.onOpen(function() {
        $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.extreme.uuid, function(data) {
          var dataView = new DataView(data);
          var t = dataView.getUint32(0, true);
          var x = dataView.getInt16(4, true);
          var y = dataView.getInt16(6, true);
          var z = dataView.getInt16(8, true);
          var message = [t, x, y, z].join('\t');
          $log.debug('sending WS message: ' + message);
          websocket.send(message);
        });

        $log.info('extremes subscribed');
        q.resolve();
      });

      websocket.onError(function(err) {
        q.reject(err);
      });
    });

    return q.promise;
  };

  var unsubscribeExtremes = function() {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';
      $log.debug('unsubscribing extremes');

      $cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.extreme.uuid);
      websocket.close();
      $log.info('extremes unsubscribed');
    });
  };

  var pair = function() {
    return isConnected().then(function(connected) {
      if (!connected) throw 'experience not connected';

      $log.info('device ' + storeService.getDeviceID() + ' paired');
      storeService.setPairedID(storeService.getDeviceID());
    });
  };

  var isConnected = function() {
    var q = $q.defer();
    var deviceID = storeService.getDeviceID();

    // no deviceID = not connected
    if (!deviceID) {
      q.resolve(false);
      return q.promise;
    }

    $log.debug('checking connection status for ' + deviceID);
    $cordovaBLE.isConnected(deviceID).then(function() {
      $log.debug(deviceID + ' is connected');
      q.resolve(true);
    }).catch(function() {
      $log.debug(deviceID + ' is not connected');
      q.resolve(false);
    });

    return q.promise;
  };

  var getElapsedTime = function() {
    // return elapsed time from start of measurement (in milliseconds)
    return startTime != null ? (stopTime != null ? stopTime : Date.now()) - startTime : 0;
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
  this.subscribeExtremes = subscribeExtremes;
  this.unsubscribeExtremes = unsubscribeExtremes;
  this.getElapsedTime = getElapsedTime;
  this.pair = pair;
  this.isConnected = isConnected;
  this.getScore = getScore;
  this.getCumulativeScore = getCumulativeScore;

});
