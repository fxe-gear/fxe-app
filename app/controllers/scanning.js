'use strict';

var module = angular.module('fxe.controllers.scanning', []);

var ScanningController = function ($scope, $state, $log, $ionicHistory, $ionicPopup, $q, fxeService, apiService, appVersion) {

  $scope.status = null;
  $scope.working = false;
  $scope.ignoredDevices = 0;

  var upgradeOrPair = function (device) {

    // get latest firmware from API
    var latestFirmwarePromise = apiService.getLatestFirmware(device, appVersion)
      .catch(function (error) {
        return $ionicPopup.alert({
          title: 'Cannot get the latest firmware.',
          template: 'The internet connection is required to verify your FXE compatibility.<br><br>' + error.statusText,
          okType: 'button-assertive'
        }).then(function () {
          throw error;
        });
      });

    // get the current firmware from device
    var firmwareVersionPromise = fxeService.getFirmwareVersion()
      .catch(function (error) {
        return $ionicPopup.alert({
          title: 'Cannot read current firmware version.',
          template: 'Cannot read the current firmware version from your FXE. Please try again<br><br>' + error,
          okType: 'button-assertive'
        }).then(function () {
          throw error;
        });
      });

    return $q.all([latestFirmwarePromise, firmwareVersionPromise])
      .then(function (promises) {
        var apiVersion = promises[0].data.application.version;
        var deviceVersion = promises[1];
        $log.debug('comparing device firmware ' + deviceVersion + ' and API firmware ' + apiVersion);

        if (apiVersion == deviceVersion) {
          // device firmware and API firmware match => device has latest firmware
          return $state.go('pairing');

        } else {
          // new firmware available
          $ionicHistory.nextViewOptions({
            historyRoot: true
          });
          return $state.go('firmware-upgrade');
        }
      })
      .catch(onFail);
  };

  var enter = function () {
    if (fxeService.isPaired()) $scope.gotoStart();

    $scope.status = 'starting';
    $scope.working = true;
    $scope.ignoredDevices = 0;

    enableBluetooth()
      .then(disconnect)
      .then(scan)
      .then(connect)
      .then(upgradeOrPair, null, function () {
        // ignored device found
        $scope.ignoredDevices++;
      });
  };

  var onFail = function (error) {
    $scope.working = false;
    $scope.status = 'failed';

    return $ionicPopup.alert({
      title: 'Scanning failed.',
      template: 'Please try again.<br><br>' + error,
      okType: 'button-assertive'
    }).then(function () {
      throw error;
    });
  };

  var enableBluetooth = function () {
    $scope.status = 'enablingBluetooth';
    return fxeService.enable().catch(onFail);
  };

  var disconnect = function () {
    $scope.status = 'disconnecting';
    return fxeService.disconnect().catch(onFail);
  };

  var scan = function () {
    $scope.status = 'scanning';
    return fxeService.scan().catch(onFail);
  };

  var connect = function (device) {
    $scope.status = 'connecting';
    // automatically stops scanning
    return fxeService.connect(device).catch(onFail);
  };

  var leave = function () {
    $scope.working = false;
    $scope.status = null;
    $scope.ignoredDevices = 0;
    return fxeService.stopScan().catch(onFail);
  };

  $scope.clearIgnored = function () {
    fxeService.clearIgnored();
    fxeService.stopScan().then(enter);
  };

  $scope.gotoStart = function () {
    $ionicHistory.nextViewOptions({
      historyRoot: true
    });
    $state.go('main.start');
  };

  $scope.tryAgain = enter;

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterLeave', leave);
};

module.controller('ScanningController', ScanningController);
