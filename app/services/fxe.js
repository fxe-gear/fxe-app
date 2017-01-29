'use strict';

var module = angular.module('fxe.services.fxe', []);

module.constant('lowBatteryLevel', 0.1); // in percent

module.factory('fxeService', function ($rootScope, $q, $log, bleService, bleApi, sports, lowBatteryLevel) {

  // on init set filter for all BLE scans to FXE specific UUIDs
  bleService.setDeviceFilter([bleApi.control.uuid]);

  var setColor = function (color) {
    $log.debug('setting color to ' + color);

    // split color in "#RRGGBB" format to byte array
    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue

    return bleService.write(bleApi.led.uuid, bleApi.led.chrcs.color.uuid, data).then(function () {
      $log.info('color set to ' + color);
    }).catch(function (error) {
      $log.error('setting color failed', error);
      throw error;
    });
  };

  var clearColor = function () {
    return setColor('#000000');
  };

  var scoreChangedCallback = function (uuid, callback, data) {
    // get score from BLE raw data
    var score = new Float32Array(data)[0];

    // BLE sport score UUIDs starts at 0x6c01 and increments by 1
    // so just subtract 0x6c00 and we have a score ID
    var type = parseInt(uuid, 16) - 0x6c00;

    if (callback) {
      callback(score, type);
    }
  };

  // FIXME
  var getScoreUUIDsForSport = function (sport) {
    if (sport == sports.jumping) {
      return [
        bleApi.jumping.chrcs.amplitude.uuid,
        bleApi.jumping.chrcs.rhythm.uuid,
        bleApi.jumping.chrcs.frequency.uuid
      ];
    } else if (sport == sports.running) {
      return [
        bleApi.running.chrcs.amplitude.uuid,
        bleApi.running.chrcs.rhythm.uuid,
        bleApi.running.chrcs.frequency.uuid
      ];
    } else {
      throw 'not implemented';
    }
  };

  // FIXME
  var getServiceUUIDForSport = function (sport) {
    if (sport == sports.jumping) {
      return bleApi.jumping.uuid;
    } else if (sport == sports.running) {
      return bleApi.running.uuid;
    } else {
      throw 'not implemented';
    }
  };

  // FIXME
  var getSportForUUID = function (uuid) {
    if (uuid == parseInt(bleApi.jumping.uuid, 16)) {
      return 1;
    } else if (uuid == parseInt(bleApi.running.uuid, 16)) {
      return 2;
    } else {
      throw 'not implemented';
    }
  };

  var startMeasurement = function (sport, scoreCallback) {
    $log.debug('starting measurement');

    // convert sport type to UUIDs
    var scoreUUIDs = getScoreUUIDsForSport(sport);
    var sportUUID = getServiceUUIDForSport(sport);

    // BLE raw data
    var zeroScore = new Float32Array([0]);
    var startCommand = new Uint8Array([0x01]);
    var sportType = new Uint16Array([parseInt(sportUUID, 16)]);
    var timeoutLength = new Uint16Array([0xff]); // in seconds

    return getMeasuredSport()
      .then(function (sport) {
        var promises = [];

        if (sport) {
          // if measurement is running, just read previous scores
          angular.forEach(scoreUUIDs, function (uuid) {
            promises.push(bleService.read(sportUUID, uuid).then(function (data) {
              scoreChangedCallback(uuid, scoreCallback, data);
            }));
          });

        } else {
          // if not, delete previous scores
          angular.forEach(scoreUUIDs, function (uuid) {
            promises.push(bleService.write(sportUUID, uuid, zeroScore));
          });

          // and write a sport
          promises.push(bleService.write(bleApi.control.uuid, bleApi.control.chrcs.sport.uuid, sportType));
        }

        // write timeout
        promises.push(bleService.write(bleApi.control.uuid, bleApi.control.chrcs.sleep.uuid, timeoutLength));

        // commit
        return $q.all(promises);
      })
      .then(function () {
        // start notification for each score type
        return $q.all(
          scoreUUIDs.map(function (uuid) {
            return bleService.startNotification(sportUUID, uuid, function (data) {
              scoreChangedCallback(uuid, scoreCallback, data);
            });
          })
        );
      })
      .then(function () {
        // start measurement
        return bleService.write(bleApi.control.uuid, bleApi.control.chrcs.measure.uuid, startCommand);
      })
      .then(function () {
        $log.info('measurement started');
      })
      .catch(function (error) {
        $log.error('starting measurement failed', error);
        throw error;
      });
  };

  var stopMeasurement = function (sport) {
    $log.debug('stopping measurement');

    // stop measurement
    var stopStatus = new Uint8Array([0x00]);
    return bleService.write(bleApi.control.uuid, bleApi.control.chrcs.measure.uuid, stopStatus)
      .then(function () {
        // reset measured sport
        var noSport = new Uint16Array([0x00]);
        return bleService.write(bleApi.control.uuid, bleApi.control.chrcs.sport.uuid, noSport);
      })
      .then(function () {
        // stop notifications
        angular.forEach(getScoreUUIDsForSport(sport), function (uuid) {
          bleService.stopNotification(bleApi.jumping.uuid, uuid);
        });
      })
      .then(function () {
        $log.info('measurement stopped');
      }).catch(function (error) {
        $log.error('measurement stopping failed', error);
        throw error;
      });
  };

  var getMeasuredSport = function () {
    $log.debug('getting measured sport');

    return bleService.read(bleApi.control.uuid, bleApi.control.chrcs.sport.uuid)
      .then(function (raw) {
        var dataView = new DataView(raw);
        var sportUUID;
        if (dataView.byteLength == 2) {
          sportUUID = dataView.getUint16(0, true);
        } else if (dataView.byteLength == 1) {
          sportUUID = dataView.getUint8(0);
        } else {
          throw 'unexpected sport value';
        }
        if (sportUUID !== 0x00) {
          var sport = getSportForUUID(sportUUID);
          $log.info('fxe is measuring sport ' + sport);
          return sport;
        } else {
          $log.info('fxe is not measuring');
          return 0;
        }
      }).catch(function (error) {
        $log.error('measurement checking failed', error);
        throw error;
      });
  };

  var parseBatteryLevel = function (raw) {
    var dataView = new DataView(raw);
    var level = dataView.getUint8(0);
    $log.debug('battery level is ' + level + '%');
    return level / 100; // return in percent
  };

  var onBatteryLevelChange = function (raw) {
    var level = parseBatteryLevel(raw);
    if (level <= lowBatteryLevel) {
      $rootScope.$broadcast('fxeBatteryLow', level);
    }
  };

  var getBatteryLevel = function () {
    $log.debug('getting battery level');
    return bleService.read(bleApi.battery.uuid, bleApi.battery.chrcs.level.uuid)
      .then(parseBatteryLevel)
      .catch(function (error) {
        $log.error('getting battery level failed', error);
        throw error;
      });
  };

  var enableBatteryWarning = function () {
    $log.debug('enabling battery warning');

    // start notification
    return bleService.startNotification(bleApi.battery.uuid, bleApi.battery.chrcs.level.uuid, onBatteryLevelChange)
      .then(function () {
        $log.info('battery warning enabled');
      }).catch(function (error) {
        $log.error('enabling battery warning failed', error);
        throw error;
      });
  };

  var disableBatteryWarning = function () {
    $log.debug('disabling battery warning');

    // stop notification
    return bleService.stopNotification(bleApi.battery.uuid, bleApi.battery.chrcs.level.uuid)
      .then(function () {
        $log.info('battery warning disabled');
      }).catch(function (error) {
        $log.error('disabling battery warning failed', error);
        throw error;
      });
  };

  var getFirmwareVersion = function () {
    $log.debug('getting firmware version');
    return bleService.read(bleApi.device.uuid, bleApi.device.chrcs.firmware.uuid)
      .then(function (raw) {
        var asciiArray = new Uint8Array(raw);
        return String.fromCharCode.apply(String, Array.from(asciiArray));
      })
      .catch(function (error) {
        $log.error('getting firmware version failed', error);
        throw error;
      });
  };

  var upgradeFirmware = function (firmwareUrl) {
    var q = $q.defer();

    var statusCallback = function (status) {
      if (status.status == 'progressChanged') {
        var percent = status.progress.percent;
        var speed = status.progress.speed.toFixed(2);
        $log.debug('firmware upgrade progress: ' + percent + '%, speed ' + speed + ' Kb/s');
      } else {
        $log.debug('firmware upgrade: ' + status.status);
      }

      // notify caller about the status
      q.notify(status);

      if (status.status == 'dfuCompleted') {
        q.resolve();
      } else if (status.status == 'dfuAborted') {
        q.reject('upgrade aborted');
      }
    };

    return bleService.isConnected()
      .then(function (connected) {
        if (!connected) throw 'fxe not connected';
        return disableConnectionHolding();
      })
      .then(function () {
        $log.debug('starting firmware upgrade');
        ble.upgradeFirmware(bleService.getConnected(), firmwareUrl, statusCallback, q.reject);
        return q.promise;
      })
      .then(function () {
        $log.info('firmware upgrade complete');
      })
      .catch(function (error) {
        $log.error('firmware upgrade failed', error);
        throw error;
      });
  };

  var disableConnectionHolding = function () {
    return $q.all([disableBatteryWarning(), bleService.disableConnectionHolding()])
  };

  // fxeService is effectively an extended bleService
  var extended = angular.extend({}, bleService);

  extended.setColor = setColor;
  extended.clearColor = clearColor;
  extended.startMeasurement = startMeasurement;
  extended.stopMeasurement = stopMeasurement;
  extended.getMeasuredSport = getMeasuredSport;
  extended.enableBatteryWarning = enableBatteryWarning;
  extended.disableBatteryWarning = disableBatteryWarning;
  extended.getBatteryLevel = getBatteryLevel;
  extended.getFirmwareVersion = getFirmwareVersion;
  extended.upgradeFirmware = upgradeFirmware;
  extended.disableConnectionHolding = disableConnectionHolding;

  return extended;
});
