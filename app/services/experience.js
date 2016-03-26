'use strict';

angular.module('experience.services.experience', [])

// naming note: "chrcs" stands for "characteristics"
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

.constant('lowBatteryLevel', 0.1) // in percent

.service('experienceService', function ($rootScope, $websocket, $q, $log, bleDevice, storeService, bleServices, scoreTypes, lowBatteryLevel) {

  // some shortcuts
  var bls = bleServices;
  var scoreUUIDs = [
    bls.experience.chrcs.amplitude.uuid,
    bls.experience.chrcs.rhythm.uuid,
    bls.experience.chrcs.frequency.uuid,
  ];

  var scan = function () {
    return bleDevice.scan([bls.experience.uuid]);
  };

  var setColor = function (color) {
    $log.debug('setting color to ' + color);

    // split color in "#RRGGBB" format to byte array
    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue

    return bleDevice.write(bls.led.uuid, bls.led.chrcs.led.uuid, data).then(function () {
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
          bleDevice.read(bls.experience.uuid, uuid).then(function (data) {
            scoreChangedCallback(uuid, data);
          });
        });

      } else {
        // delete previous scores
        storeService.startLesson();
        angular.forEach(scoreUUIDs, function (uuid) {
          bleDevice.write(bls.experience.uuid, uuid, zeroScore);
        });
      }
    });

    // for each score type
    angular.forEach(scoreUUIDs, function (uuid) {
      bleDevice.startNotification(bls.experience.uuid, uuid, function (data) {
        scoreChangedCallback(uuid, data);
      });
    });

    // write timeout
    bleDevice.write(bls.experience.uuid, bls.experience.chrcs.sleep.uuid, timeoutLength);

    // start measurement
    return bleDevice.write(bls.experience.uuid, bls.experience.chrcs.control.uuid, startCommand).then(function () {
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
      bleDevice.startNotification(bls.experience.uuid, uuid);
    });

    // stop measurement
    return bleDevice.write(bls.experience.uuid, bls.experience.chrcs.control.uuid, stopMeasurementCommand)
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

    return bleDevice.read(bls.experience.uuid, bls.experience.chrcs.control.uuid).then(function (data) {
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
    return bleDevice.read(bls.battery.uuid, bls.battery.chrcs.level.uuid)
      .then(parseBatteryLevel)
      .catch(function (error) {
        $log.error('getting battery level failed');
        throw error;
      });
  };

  var enableBatteryWarning = function () {
    $log.debug('enabling battery warning');

    // start notification
    return bleDevice.startNotification(bls.battery.uuid, bls.battery.chrcs.level.uuid, onBatteryLevelChange).then(function () {
      $log.info('battery warning enabled');
    }).catch(function (error) {
      $log.error('enabling battery warning failed');
      throw error;
    });
  };

  var disableBatteryWarning = function () {
    $log.debug('disabling battery warning');

    // stop notification
    return bleDevice.stopNotification(bls.battery.uuid, bls.battery.chrcs.level.uuid).then(function () {
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

      bleDevice.startNotification(bls.experience.uuid, bls.experience.chrcs.extreme.uuid, onExtremeReceived).then(function () {
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

    return bleDevice.stopNotification(bls.experience.uuid, bls.experience.chrcs.extreme.uuid).then(function () {
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
