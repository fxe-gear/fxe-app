'use strict';

var module = angular.module('experience.controllers.scanning', []);

var ScanningController = function ($scope, $state, $ionicPlatform, $ionicHistory, $ionicPopup, bleDevice, experienceService, storeService) {

  $scope.status = 'Starting...';
  $scope.working = true;
  $scope.ignoredDevices = 0;

  $scope.clearIgnored = function () {
    bleDevice.clearIgnored();
    bleDevice.stopScan().then(enter);
  };

  $scope.gotoJumping = function () {
    $ionicHistory.nextViewOptions({
      historyRoot: true,
    });
    $state.go('main.jumping');
  };

  var enter = function () {
    if (storeService.isPaired()) $scope.gotoJumping();

    $scope.ignoredDevices = 0;
    $ionicPlatform.ready()
      .then(enableBluetooth)
      .then(disconnect)
      .then(scan)
      .then(connect)
      .then(function () {
        // prevent changing state when the process has aleready been canceled
        if ($state.current.controller != 'ScanningController') return disconnect();
        $state.go('pairing');
      }, null, function (device) {
        // ignored device found
        $scope.ignoredDevices++;
      });
  };

  $scope.tryAgain = enter;

  var enableBluetooth = function () {
    $scope.working = true;
    $scope.status = 'Enabling bluetooth...';
    return bleDevice.enable().catch(function (error) {
      $scope.working = false;
      $scope.status = 'Cannot enable bluetooth. Please enable it manually.';
      throw error;
    });
  };

  var disconnect = function () {
    $scope.working = true;
    $scope.status = 'Disconnecting previously connected devices...';
    return bleDevice.isConnected().then(function (connected) {
      if (connected) bleDevice.disconnect();
    }).catch(function (error) {
      $scope.working = false;
      $scope.status = 'Disconnecting failed';
      throw error;
    });
  };

  var scan = function () {
    $scope.working = true;
    $scope.status = 'Scanning...';
    return experienceService.scan().catch(function (error) {
      $scope.working = false;
      $scope.status = 'Scanning failed';
      throw error;
    });
  };

  var connect = function (device) {
    $scope.working = true;
    $scope.status = 'Connecting...';
    return bleDevice.connect(device).catch(function (error) {
      $scope.working = false;
      $scope.status = 'Connecting failed';
      throw error;
    });
  };

  var leave = function () {
    $scope.working = false;
    $scope.status = 'Ready';
    return bleDevice.stopScan();
  };

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterLeave', leave);
};

module.controller('ScanningController', ScanningController);
