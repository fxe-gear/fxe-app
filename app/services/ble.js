'use strict';

angular.module('fxe.services.ble', [])

.constant('reconnectTimeout', 3000) // in milliseconds

.service('bleDevice', function ($rootScope, $ionicPlatform, $cordovaBLE, $q, $log, $timeout, storeService, reconnectTimeout) {

  var scanning = false;
  var _disableConnectionHolding = null;

  $ionicPlatform.ready().then(function () {
    try {
      ble.isEnabled;
    } catch (e) {
      $log.error('no ble, no fun');
    }
  });

  var enable = function () {
    var q = $q.defer();
    $log.debug('enabling bluetooth');

    $ionicPlatform.ready()
      .then($cordovaBLE.isEnabled)
      .then(q.resolve) // already enabled
      .catch(function (error) { // not enabled
        if (typeof ble.enable === 'undefined') {
          // iOS doesn't have ble.enable
          q.reject('cannot enable bluetooth, probably on iOS');
        } else {
          // Android
          $rootScope.$broadcast('fxeEnablingStarted');

          $cordovaBLE.enable()
            .then(function () {
              $log.info('bluetooth enabled');
              q.resolve();
            })
            .catch(function (error) {
              $log.warn('bluetooth not enabled');
              q.reject(error);
            });
        }
      });

    return q.promise;
  };

  var scan = function (services) {
    return $ionicPlatform.ready().then(function () {
      var q = $q.defer();
      $log.debug('starting ble scan for ' + services);

      var onDeviceFound = function (device) {
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
      };

      $ionicPlatform.ready().then(function () {
        scanning = true;
        $cordovaBLE.startScan(services, onDeviceFound, q.reject);
        $rootScope.$broadcast('fxeScanningStarted');
        $log.info('scanning started');
      });

      return q.promise;
    });
  };

  var stopScan = function () {
    if (!scanning) return $q.resolve();
    $log.debug('stopping ble scan');

    return $ionicPlatform.ready()
      .then($cordovaBLE.stopScan)
      .then(function (result) {
        scanning = false;
        $log.info('scanning stopped');
        return result;
      })
      .catch(function (error) {
        $log.error('scanning stop failed');
        throw error;
      });
  };

  var connect = function (deviceID) {
    return $ionicPlatform.ready().then(function () {
      var q = $q.defer();
      $log.debug('connecting to ' + deviceID);
      $rootScope.$broadcast('fxeConnectingStarted');

      ble.connect(deviceID,
        function (device) {
          $log.info('connected to ' + deviceID);
          storeService.setDeviceID(deviceID);
          $rootScope.$broadcast('fxeConnected');
          q.resolve(deviceID);
        },

        function (error) {
          $log.error('connecting to ' + deviceID + ' failed / device disconnected later');
          $rootScope.$broadcast('fxeDisconnected');
          q.reject(error);
        });

      return q.promise;
    });

  };

  var reconnect = function () {
    if (!storeService.isPaired()) return $q.reject('unable to reconnect, no device is paired');

    return isConnected().then(function (connected) {
      if (!connected) return enable().then(function () {
        // empty list because we already have paired device so we don't have to filter them
        return scan([]);
      }).then(connect);
    });
  };

  var disconnect = function () {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      var deviceID = storeService.getDeviceID();
      $log.debug('disconnecting from ' + deviceID);

      return disableConnectionHolding()
        .then(function () {
          return $cordovaBLE.disconnect(deviceID);
        }).then(function (result) {
          storeService.setDeviceID(null);
          $rootScope.$broadcast('fxeDisconnected');
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
    _disableConnectionHolding = $rootScope.$on('fxeDisconnected', onDisconnect);
    isConnected().then(function (connected) {
      if (connected) $rootScope.$broadcast('fxeConnected');
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
      return $cordovaBLE.read(storeService.getDeviceID(), service, chrcs);
    });
  };

  var write = function (service, chrcs, data) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('writing data ' + data + ' to ' + service + '-' + chrcs);
      return $cordovaBLE.write(storeService.getDeviceID(), service, chrcs, data.buffer);
    });
  };

  var writeWithoutResponse = function (service, chrcs, data) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('writing (without response) data ' + data + ' to ' + service + '-' + chrcs);
      return $cordovaBLE.writeWithoutResponse(storeService.getDeviceID(), service, chrcs, data.buffer);
    });
  };

  var startNotification = function (service, chrcs, handler) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('starting notifications for ' + service + '-' + chrcs);
      return $cordovaBLE.startNotification(storeService.getDeviceID(), service, chrcs, handler);
    });
  };

  var stopNotification = function (service, chrcs) {
    return isConnected().then(function (connected) {
      if (!connected) throw 'fxe not connected';

      $log.debug('stopping notifications for ' + service + '-' + chrcs);
      return $cordovaBLE.stopNotification(storeService.getDeviceID(), service, chrcs);
    });
  };

  var isConnected = function () {
    return $ionicPlatform.ready().then(function () {
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
});
