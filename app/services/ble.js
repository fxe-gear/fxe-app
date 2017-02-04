'use strict';

var module = angular.module('fxe.services.ble', []);

module.constant('reconnectTimeout', 3000); // in milliseconds

module.service('bleService', function ($rootScope, $ionicPlatform, $cordovaBLE, $q, $log, $timeout, $localStorage, reconnectTimeout) {

  // try if a mobile phone has BLE support
  $ionicPlatform.ready()
    .then(function () {
      try {
        ble.isEnabled();
      } catch (e) {
        $log.error('no ble, no fun');
      }
    });

  var scanning = false;
  var stoppingScan = false;
  var _disableConnectionHolding = null;

  var $storage = $localStorage.$default({
    // MAC addresses of devices in various states
    connected: null,
    paired: null,
    ignored: [],
    filter: []
  });

  var setDeviceFilter = function (filter) {
    $storage.filter.length = 0;
    $storage.filter.push.apply($storage.filter, filter);
    $localStorage.$apply(); // see https://github.com/gsklee/ngStorage/pull/145
  };

  var getConnected = function () {
    return $storage.connected;
  };

  var isPaired = function () {
    return $storage.paired != null;
  };

  var isIgnored = function (device) {
    return $storage.ignored.indexOf(device) != -1;
  };

  var enable = function () {
    $log.debug('enabling bluetooth');

    return $ionicPlatform.ready()
      .then($cordovaBLE.isEnabled)
      .then(function () {
        $log.warn('bluetooth already enabled');
      })
      .catch(function () {
        // if bluetooth not enabled
        if (typeof ble.enable === 'undefined') {
          // iOS doesn't have ble.enable
          $log.error('cannot enable bluetooth, probably on iOS');
          throw 'ble.enable is undefined';
          // TODO show alert to enable manually

        } else {
          // Android
          $rootScope.$broadcast('bleEnablingStarted');

          return $cordovaBLE.enable()
            .then(function () {
              $log.info('bluetooth enabled');
            })
            .catch(function (error) {
              $log.warn('bluetooth not enabled');
              throw error
            });
        }
      });
  };

  var scan = function () {
    $log.debug('starting ble scan for ' + $storage.filter);

    return $ionicPlatform.ready().then(function () {
      var q = $q.defer();

      var onDeviceFound = function (device) {
        if (stoppingScan) {
          // ignore found devices during stopping scan
          return;
        }

        device = device.id;
        if (isPaired()) {
          // if paired device is stored

          if ($storage.paired == device) {
            // found the paired device
            $log.debug('found paired ' + device);
            stopScan().then(function () {
              q.resolve(device);
            });
          } else {
            // found another (not paired) device
            $log.debug('found not paired ' + device);
          }

        } else {
          // else, if no paired device is stored

          if (!isIgnored(device)) {
            // found new (not ignored) device
            $log.info('found new ' + device);
            stopScan().then(function () {
              q.resolve(device);
            });

          } else {
            // found ignored device
            $log.debug('found ignored ' + device);
            q.notify(device);
          }
        }
      };

      ble.startScanWithOptions($storage.filter, {reportDuplicates: false}, onDeviceFound, q.reject);
      scanning = true;
      $rootScope.$broadcast('bleScanningStarted');
      $log.info('scanning started');

      return q.promise;
    });
  };

  var stopScan = function () {
    if (!scanning) {
      $log.warn('ignoring stop ble scan request - no scan in progress');
      return $q.resolve();
    }
    stoppingScan = true;
    $log.debug('stopping ble scan');

    return $ionicPlatform.ready()
      .then($cordovaBLE.stopScan)
      .then(function (result) {
        scanning = false;
        stoppingScan = false;
        $log.info('scanning stopped');
        return result;
      })
      .catch(function (error) {
        $log.error('stopping ble scan failed', error);
        throw error;
      });
  };

  var connect = function (device) {
    return $ionicPlatform.ready().then(function () {
      var q = $q.defer();
      $log.debug('connecting to ' + device);
      $rootScope.$broadcast('bleConnectingStarted');

      ble.connect(device,
        function () {
          $log.info('connected to ' + device);
          setConnected(device);
          $rootScope.$broadcast('bleConnected');
          q.resolve(device);
        },

        function (error) {
          $log.error('connecting to ' + device + ' failed / device disconnected later', error);
          setConnected(null);
          $rootScope.$broadcast('bleDisconnected');
          q.reject(error);
        });

      return q.promise;
    });

  };

  var reconnect = function () {
    if (!isPaired()) {
      $log.error('unable to reconnect, no device is paired');
      return $q.reject();
    }

    return isConnected()
      .then(function (connected) {
        if (connected) return;
        return enable()
          .then(scan)
          .then(connect);
      });
  };

  var disconnect = function () {
    return isConnected().then(function (connected) {
      if (!connected) {
        $log.warn('ignoring disconnect request - no device is connected');
        return $q.resolve();
      }

      var device = $storage.connected;
      $log.debug('disconnecting from ' + device);

      return disableConnectionHolding()
        .then(function () {
          return $cordovaBLE.disconnect(device);
        }).then(function (result) {
          setConnected(null);
          $rootScope.$broadcast('bleDisconnected');
          $log.info('disconnected from ' + device);
          return result;
        }).catch(function (error) {
          $log.error('disconnecting from ' + device + ' failed', error);
          throw error;
        });
    });
  };

  var setConnected = function (device) {
    $storage.connected = device;
    $localStorage.$apply(); // see https://github.com/gsklee/ngStorage/pull/145
  };

  var pair = function () {
    $storage.paired = $storage.connected;
    $log.info('device ' + $storage.paired + ' paired');
    $localStorage.$apply(); // see https://github.com/gsklee/ngStorage/pull/145
  };

  var unpair = function () {
    $storage.paired = null;
    $log.info('device ' + $storage.connected + ' unpaired');
    $localStorage.$apply(); // see https://github.com/gsklee/ngStorage/pull/145
  };

  var ignore = function () {
    // TODO refactor
    var device = $storage.connected;
    if (!device) {
      $log.warn('ignoring ignore request - no device is connected');
      return $q.resolve();
    }
    if (!isIgnored(device)) {
      $storage.ignored.push(device);
      $localStorage.$apply(); // see https://github.com/gsklee/ngStorage/pull/145
      $log.info(device + ' added to ignore list');
    } else {
      $log.warn('ignoring ignore request - device ' + device + ' already ignored');
    }
    return $q.resolve();
  };

  var clearIgnored = function () {
    $storage.ignored.length = 0;
    $localStorage.$apply(); // see https://github.com/gsklee/ngStorage/pull/145
    return $q.resolve();
  };

  var holdConnection = function () {
    if (!isPaired()) {
      return $q.reject('unable to hold connection, no device is paired');
    }

    // disable previsously held state if needed
    disableConnectionHolding();

    $log.info('holding connection');
    var onDisconnect = function () {
      // if not connected but should be
      reconnect().catch(function (error) {
        // if connecting failed, try again in 3 sec
        $log.error('reconnecting error during connection holding, trying again in ' + reconnectTimeout, error);
        $timeout(function () {
          onDisconnect();
        }, reconnectTimeout);
      });
    };

    // permanent callback and first time trigger
    _disableConnectionHolding = $rootScope.$on('bleDisconnected', onDisconnect);
    isConnected().then(function (connected) {
      if (connected) $rootScope.$broadcast('bleConnected');
      else onDisconnect();
    });

    return $q.resolve();
  };

  var disableConnectionHolding = function () {
    if (_disableConnectionHolding) {
      $log.debug('disabling connection holding');
      _disableConnectionHolding();
      _disableConnectionHolding = null;
      $log.info('connection holding disabled');
    }

    return $q.resolve();
  };

  // naming note: "chrcs" stands for "characteristics"

  var read = function (service, chrcs) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('reading ' + service + '-' + chrcs);
      return $cordovaBLE.read($storage.connected, service, chrcs);
    });
  };

  var write = function (service, chrcs, data) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('writing data ' + data + ' to ' + service + '-' + chrcs);
      return $cordovaBLE.write($storage.connected, service, chrcs, data.buffer);
    });
  };

  var writeWithoutResponse = function (service, chrcs, data) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('writing (without response) data ' + data + ' to ' + service + '-' + chrcs);
      return $cordovaBLE.writeWithoutResponse($storage.connected, service, chrcs, data.buffer);
    });
  };

  var startNotification = function (service, chrcs, handler) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('starting notifications for ' + service + '-' + chrcs);
      return $cordovaBLE.startNotification($storage.connected, service, chrcs, handler);
    });
  };

  var stopNotification = function (service, chrcs) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('stopping notifications for ' + service + '-' + chrcs);
      return $cordovaBLE.stopNotification($storage.connected, service, chrcs);
    });
  };

  var isConnected = function () {
    var device = $storage.connected;
    $log.debug('checking connection status');

    // if (device !== null) {
    //   $log.debug(device + ' is connected');
    //   return $q.resolve(true);
    // } else {
    //   $log.debug('no device is connected');
    //   return $q.resolve(false);
    // }

    if (device === null) {
      $log.debug('no device is connected');
      return $q.resolve(false);
    }

    return $ionicPlatform.ready()
      .then(function () {
        return $cordovaBLE.isConnected(device);
      })
      .then(function () {
        $log.debug(device + ' is connected');
        return true;
      })
      .catch(function () {
        $log.debug(device + ' is not connected');
        $log.warn('inconsistency between stored connection status and actual status');
        return false;
      });
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
  this.disableConnectionHolding = disableConnectionHolding;
  this.read = read;
  this.write = write;
  this.writeWithoutResponse = writeWithoutResponse;
  this.startNotification = startNotification;
  this.stopNotification = stopNotification;
  this.isConnected = isConnected;
  this.getConnected = getConnected;
  this.isPaired = isPaired;
  this.setDeviceFilter = setDeviceFilter;
});
