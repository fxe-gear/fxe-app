'use strict';

// naming note: "chrcs" stands for "characteristics"

angular.module('experience.services.experience', [])

.constant('bleServices', {
  experience: {
    uuid: '6b00',
    chrcs: {
      extreme: {
        uuid: '6b01',
      },
      sleep: {
        uuid: '6b03',
      },
      control: {
        uuid: '6bff',
      },
      amplitude: {
        uuid: '6b04',
      },
      rhythm: {
        uuid: '6b05',
      },
      frequency: {
        uuid: '6b06',
      },
    },
  },
  led: {
    uuid: '6c00',
    chrcs: {
      led: {
        uuid: '6c01',
      },
    },
  },
  battery: {
    uuid: '180f',
    chrcs: {
      level: {
        uuid: '2a19',
      },
    },
  },
})

.constant('reconnectTimeout', 3000) // in milliseconds

.constant('lowBatteryLevel', 0.1) // in percent

.service('bleDeviceService', function ($rootScope, $cordovaBLE, $q, $log, $timeout, storeService, reconnectTimeout) {

  var scanning = false;
  var _disableConnectionHolding = null;

  var enable = function () {
    var q = $q.defer();

    try {
      ble.isEnabled;
    } catch (e) {
      $log.error('no ble, no fun');
      q.reject(e);
      return q.promise;
    }

    $cordovaBLE.isEnabled().then(function () { // already enabled
      q.resolve();
    }).catch(function (error) { // not enabled
      if (typeof ble.enable === 'undefined') {
        // iOS doesn't have ble.enable
        q.reject('cannot enable bluetooth, probably on iOS');
      } else {
        // Android
        $log.debug('enabling bluetooth');
        $rootScope.$broadcast('experienceEnablingStarted');

        $cordovaBLE.enable().then(function () {
          $log.info('bluetooth enabled');
          q.resolve();
        }).catch(function (error) {
          $log.warn('bluetooth not enabled');
          q.reject(error);
        });
      }
    });

    return q.promise;
  };

  var scan = function (services) {
    var q = $q.defer();
    $log.debug('starting ble scan for ' + services);
    scanning = true;

    $cordovaBLE.startScan(services, function (device) {
      var deviceID = device.id;
      if (storeService.isPaired()) { // paired
        if (storeService.getPairedID() == deviceID) { // found paired device
          $log.info('found paired ' + deviceID);
          stopScan().then(function () {
            q.resolve(deviceID);
          });
        } else { // found another (not paired) device
          $log.info('found not paired ' + deviceID);
        }

      } else { // not paired yet
        if (!storeService.isIgnored(deviceID)) { // found new (not ignored) device
          $log.info('found ' + deviceID);
          stopScan().then(function () {
            q.resolve(deviceID);
          });
        } else { // found ignored
          $log.info('found ignored ' + deviceID);
          q.notify(deviceID);
        }
      }
    }, q.reject);

    $rootScope.$broadcast('experienceScanningStarted');
    $log.info('scanning started');
    return q.promise;
  };

  var stopScan = function () {
    if (!scanning) return $q.resolve();
    $log.debug('stopping ble scan');
    return $cordovaBLE.stopScan().then(function (result) {
      scanning = false;
      $log.info('scanning stopped');
      return result;
    }).catch(function (error) {
      $log.error('scanning stop failed');
      throw error;
    });
  };

  var connect = function (deviceID) {
    var q = $q.defer();
    $log.debug('connecting to ' + deviceID);
    $rootScope.$broadcast('experienceConnectingStarted');

    ble.connect(deviceID,
      function (device) {
        $log.info('connected to ' + deviceID);
        storeService.setDeviceID(deviceID);
        $rootScope.$broadcast('experienceConnected');
        q.resolve(deviceID);
      },

      function (error) {
        $log.error('connecting to ' + deviceID + ' failed / device disconnected later');
        $rootScope.$broadcast('experienceDisconnected');
        q.reject(error);
      });

    return q.promise;
  };

  var reconnect = function () {
    if (!storeService.isPaired()) return $q.reject('unable to reconnect, no device is paired');

    return isConnected().then(function (connected) {
      if (connected) return;
      else return enable().then(function () {
        // empty list because we already have paired device so we don't have to filter them
        return scan([]);
      }).then(connect);
    });
  };

  var disconnect = function () {
    return isConnected().then(function (connected) {
      if (!connected) throw 'experience not connected';

      var deviceID = storeService.getDeviceID();
      $log.debug('disconnecting from ' + deviceID);

      return disableConnectionHolding()
        .then(function () {
          return $cordovaBLE.disconnect(deviceID);
        }).then(function (result) {
          storeService.setDeviceID(null);
          $rootScope.$broadcast('experienceDisconnected');
          $log.info('disconnected from ' + deviceID);
          return result;
        }).catch(function (error) {
          $log.error('disconnecting from ' + deviceID + ' failed');
          throw error;
        });
    });
  };

  var pair = function () {
    $log.info('device ' + storeService.getDeviceID() + ' paired');
    storeService.setPairedID(storeService.getDeviceID());
    return $q.resolve();
  };

  var unpair = function () {
    storeService.setPairedID(null);
    $log.info('device ' + storeService.getDeviceID() + ' unpaired');
    return $q.resolve();
  };

  var ignore = function () {
    if (!storeService.getDeviceID()) return $q.reject('unable to ignore, no device is connected');
    storeService.ignore(storeService.getDeviceID());
    $log.info(storeService.getDeviceID() + ' added to ignore list');
    return $q.resolve();
  };

  var clearIgnored = function () {
    storeService.clearIgnored();
    return $q.resolve();
  };

  var holdConnection = function () {
    // disable previsously held state if needed
    disableConnectionHolding();

    $log.info('holding connection');
    var onDisconnect = function () {
      // if not connected but should be
      reconnect().catch(function (error) {
        // if connecting failed, try again in 3 sec
        $log.error('reconnecting error during connection holding: ' + error + ', trying again in ' + reconnectTimeout);
        $timeout(function () {
          onDisconnect();
        }, reconnectTimeout);
      });
    };

    // permanent callback and first time trigger
    _disableConnectionHolding = $rootScope.$on('experienceDisconnected', onDisconnect);
    isConnected().then(function (connected) {
      if (!connected) onDisconnect();
    });

    return $q.resolve();
  };

  var disableConnectionHolding = function () {
    if (_disableConnectionHolding) {
      $log.info('disabling connection holding');
      _disableConnectionHolding();
      _disableConnectionHolding = null;
    }

    return $q.resolve();
  };

  var read = function (service, chrcs) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'experience not connected';

      $log.debug('reading ' + service + '-' + chrcs);
      return $cordovaBLE.read(storeService.getDeviceID(), service, chrcs);
    });
  };

  var write = function (service, chrcs, data) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'experience not connected';

      $log.debug('writing data ' + data + ' to ' + service + '-' + chrcs);
      return $cordovaBLE.write(storeService.getDeviceID(), service, chrcs, data.buffer);
    });
  };

  var startNotification = function (service, chrcs, handler) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'experience not connected';

      $log.debug('starting notifications for ' + service + '-' + chrcs);
      return $cordovaBLE.startNotification(storeService.getDeviceID(), service, chrcs, handler);
    });
  };

  var stopNotification = function (service, chrcs) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'experience not connected';

      $log.debug('stopping notifications for ' + service + '-' + chrcs);
      return $cordovaBLE.stopNotification(storeService.getDeviceID(), service, chrcs);
    });
  };

  var isConnected = function () {
    var q = $q.defer();
    var deviceID = storeService.getDeviceID();

    // no deviceID = not connected
    if (!deviceID) {
      q.resolve(false);
      return q.promise;
    }

    $log.debug('checking connection status for ' + deviceID);
    $cordovaBLE.isConnected(deviceID).then(function () {
      $log.debug(deviceID + ' is connected');
      q.resolve(true);
    }).catch(function () {
      $log.debug(deviceID + ' is not connected');
      q.resolve(false);
    });

    return q.promise;
  };

  // service public API
  this.enable = enable;
  this.scan = scan;
  this.stopScan = stopScan;
  this.connect = connect;
  this.disconnect = disconnect;
  this.reconnect = reconnect;
  this.pair = pair;
  this.unpair = unpair;
  this.ignore = ignore;
  this.clearIgnored = clearIgnored;
  this.holdConnection = holdConnection;
  this.read = read;
  this.write = write;
  this.startNotification = startNotification;
  this.stopNotification = stopNotification;
  this.isConnected = isConnected;
})

// =================================================================================================

.service('experienceService', function ($rootScope, $websocket, $q, $log, bleDeviceService, storeService, bleServices, scoreTypes, lowBatteryLevel) {

  // some shortcuts
  var bls = bleServices;
  var scoreUUIDs = [
    bls.experience.chrcs.amplitude.uuid,
    bls.experience.chrcs.rhythm.uuid,
    bls.experience.chrcs.frequency.uuid,
  ];

  var scan = function () {
    return bleDeviceService.scan([bls.experience.uuid]);
  };

  var setColor = function (color) {
    $log.debug('setting color to ' + color);

    // split color in "#RRGGBB" format to byte array
    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue

    return bleDeviceService.write(bls.led.uuid, bls.led.chrcs.led.uuid, data).then(function () {
      $log.info('color set to ' + color);
    }).catch(function (error) {
      $log.error('setting color failed');
      throw error;
    });
  };

  var clearColor = function () {
    return setColor('#000000');
  };

  var scoreChangedCallback = function (uuid, data) {
    // get score from BLE raw data
    var score = new Float32Array(data)[0];

    // mapping of BLE chrcs to SQLite score types
    var type;
    switch (uuid) {
      case bls.experience.chrcs.amplitude.uuid:
        type = scoreTypes.amplitude;
        break;
      case bls.experience.chrcs.frequency.uuid:
        type = scoreTypes.frequency;
        break;
      case bls.experience.chrcs.rhythm.uuid:
        type = scoreTypes.rhythm;
        break;
    }

    storeService.addScore(score, type);
  };

  var startMeasurement = function () {
    $log.debug('starting measurement');

    // BLE raw data
    var zeroScore = new Float32Array([0]);
    var startCommand = new Uint8Array([0x01]);
    var timeoutLength = new Uint8Array([0xff]); // in seconds

    isMeasuring().then(function (measuring) {
      if (measuring) {
        // read previous scores
        angular.forEach(scoreUUIDs, function (uuid) {
          bleDeviceService.read(bls.experience.uuid, uuid).then(function (data) {
            scoreChangedCallback(uuid, data);
          });
        });

      } else {
        // delete previous scores
        storeService.startLesson();
        angular.forEach(scoreUUIDs, function (uuid) {
          bleDeviceService.write(bls.experience.uuid, uuid, zeroScore);
        });
      }
    });

    // for each score type
    angular.forEach(scoreUUIDs, function (uuid) {
      bleDeviceService.startNotification(bls.experience.uuid, uuid, function (data) {
        scoreChangedCallback(uuid, data);
      });
    });

    // write timeout
    bleDeviceService.write(bls.experience.uuid, bls.experience.chrcs.sleep.uuid, timeoutLength);

    // start measurement
    return bleDeviceService.write(bls.experience.uuid, bls.experience.chrcs.control.uuid, startCommand).then(function () {
      $log.info('measurement started');
    }).catch(function (error) {
      $log.error('starting measurement failed');
      throw error;
    });
  };

  var stopMeasurement = function () {
    $log.debug('stopping measurement');

    // BLE raw data
    var stopMeasurementCommand = new Uint8Array([0xff]);

    // unregister callbacks
    angular.forEach(scoreUUIDs, function (uuid) {
      bleDeviceService.startNotification(bls.experience.uuid, uuid);
    });

    // stop measurement
    return bleDeviceService.write(bls.experience.uuid, bls.experience.chrcs.control.uuid, stopMeasurementCommand)
      .then(storeService.endLesson)
      .then(function () {
        $log.info('measurement stopped');
      }).catch(function (error) {
        $log.error('stopping measurement failed');
        throw error;
      });
  };

  var isMeasuring = function () {
    $log.debug('checking if measurement is running');

    return bleDeviceService.read(bls.experience.uuid, bls.experience.chrcs.control.uuid).then(function (data) {
      var dataView = new DataView(data);
      var controlValue = dataView.getUint8(0, true);
      var res = controlValue == 0x01;
      $log.debug('measurement ' + (res ? 'is' : 'is not') + ' running');
      return res;
    }).catch(function (error) {
      $log.error('measurement checking failed');
      throw error;
    });
  };

  var parseBatteryLevel = function (raw) {
    var dataView = new DataView(raw);
    var level = dataView.getUint8(0, true);
    $log.debug('battery level is ' + level + '%');
    return level / 100; // return in percent
  };

  var onBatteryLevelChange = function (raw) {
    var level = parseBatteryLevel(raw);
    if (level <= lowBatteryLevel) {
      $rootScope.$broadcast('experienceBatteryLow', level);
    }
  };

  var getBatteryLevel = function () {
    $log.debug('getting battery level');
    return bleDeviceService.read(bls.battery.uuid, bls.battery.chrcs.level.uuid)
      .then(parseBatteryLevel)
      .catch(function (error) {
        $log.error('getting battery level failed');
        throw error;
      });
  };

  var enableBatteryWarning = function () {
    $log.debug('enabling battery warning');

    // start notification
    return bleDeviceService.startNotification(bls.battery.uuid, bls.battery.chrcs.level.uuid, onBatteryLevelChange).then(function () {
      $log.info('battery warning enabled');
    }).catch(function (error) {
      $log.error('enabling battery warning failed');
      throw error;
    });
  };

  var disableBatteryWarning = function () {
    $log.debug('disabling battery warning');

    // stop notification
    return bleDeviceService.stopNotification(bls.battery.uuid, bls.battery.chrcs.level.uuid).then(function () {
      $log.info('battery warning disabled');
    }).catch(function (error) {
      $log.error('disabling battery warning failed');
      throw error;
    });
  };

  // DEV function -----------------------------------------------------------------------------

  var websocket = null;

  var onExtremeReceived = function (data) {
    var dataView = new DataView(data);
    var t = dataView.getUint32(0, true);
    var x = dataView.getInt16(4, true);
    var y = dataView.getInt16(6, true);
    var z = dataView.getInt16(8, true);
    var et = dataView.getUint8(10, true); // extreme type: 1=TOP, 2=BOTTOM, 3=OTHER
    var message = [t, x, y, z, et].join('\t');
    $log.debug('sending WS message: ' + message);
    websocket.send(message);
  };

  var subscribeExtremes = function (websocketIP, websocketPort) {
    var q = $q.defer();

    var address = 'ws://' + [websocketIP, websocketPort].join(':');
    $log.debug('openning websocket ' + address);

    websocket = $websocket(address);

    websocket.onOpen(function () {
      $log.info('websocket opened');
      $log.debug('subscribing extremes');

      bleDeviceService.startNotification(bls.experience.uuid, bls.experience.chrcs.extreme.uuid, onExtremeReceived).then(function () {
        $log.info('extremes subscribed');
        q.resolve();
      }).catch(function (error) {
        $log.error('extreme subscribing failed');
        q.reject(error);
      });
    });

    return q.promise;
  };

  var unsubscribeExtremes = function () {
    $log.debug('unsubscribing extremes');

    return bleDeviceService.stopNotification(bls.experience.uuid, bls.experience.chrcs.extreme.uuid).then(function () {
      $log.info('extremes unsubscribed');
      websocket.close();
      $log.info('websocket closed');
    }).catch(function (error) {
      $log.error('extreme unsubscribing failed');
      throw error;
    });
  };

  this.scan = scan;

  this.setColor = setColor;
  this.clearColor = clearColor;
  this.startMeasurement = startMeasurement;
  this.stopMeasurement = stopMeasurement;
  this.isMeasuring = isMeasuring;
  this.enableBatteryWarning = enableBatteryWarning;
  this.disableBatteryWarning = disableBatteryWarning;

  // DEV functions
  this.getBatteryLevel = getBatteryLevel;
  this.subscribeExtremes = subscribeExtremes;
  this.unsubscribeExtremes = unsubscribeExtremes;
});
