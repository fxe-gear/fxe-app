'use strict';

var module = angular.module('experience.controllers.scanning', [
  'experience.services.experience',
]);

var ScanningController = function ($scope, $state, $ionicPlatform, $ionicPopup, experienceService) {

  $scope.status = 'Starting...';
  $scope.working = true;

  $scope.clearIgnored = function () {
    experienceService.clearIgnored();
    experienceService.stopScan().then(enter);
  };

  var enter = function () {
    $scope.ignoredDevices = 0;
    $ionicPlatform.ready()
      .then(enableBluetooth)
      .then(disconnect)
      .then(scan)
      .then(connect)
      .then(function () {
        // prevent changing state when the process has aleready been canceled
        // if ($state.current.controller != 'ScanningController') return;
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
    return experienceService.enable().catch(function (error) {
      $scope.working = false;
      $scope.status = 'Cannot enable bluetooth. Please enable it manually.';
      throw error;
    });
  };

  var disconnect = function () {
    $scope.working = true;
    $scope.status = 'Disconnecting previously connected devices...';
    return experienceService.isConnected().then(function (connected) {
      if (connected) experienceService.disconnect();
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
    return experienceService.connect(device).catch(function (error) {
      $scope.working = false;
      $scope.status = 'Connecting failed';
      throw error;
    });
  };

  var exit = function () {
    $scope.working = false;
    $scope.status = 'Ready';
    return experienceService.stopScan();
  };

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterExit', exit);
};

module.controller('ScanningController', ScanningController);
