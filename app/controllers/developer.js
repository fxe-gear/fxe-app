'use strict';

var module = angular.module('fxe.controllers.developer', []);

var DeveloperController = function ($scope, $state, $localStorage, $cordovaSQLite, $ionicPopup, fxeService, bleDevice, storeService) {

  $scope.getBatteryLevel = function () {
    fxeService.getBatteryLevel().then(function (level) {
      $ionicPopup.alert({
        title: 'Battery level',
        template: (level * 100).toFixed(0) + '%'
      });
    });
  };

  $scope.disconnect = bleDevice.disconnect;
  $scope.reconnect = bleDevice.reconnect;
  $scope.disableConnectionHolding = fxeService.disableConnectionHolding;

  $scope.dumpDB = storeService._dumpDB();

  $scope.unpair = function () {
    bleDevice.unpair()
      .then(bleDevice.isConnected)
      .then(function (connected) {
        if (connected) return bleDevice.disconnect();
      }).then(function () {
        $state.go('scanning');
      });
  };

  $scope.clearAll = function () {
    bleDevice.isConnected().then(function (connected) {
      if (connected) return bleDevice.disconnect();
    }).then(function () {
      $localStorage.$reset();
      $cordovaSQLite.deleteDB({
        name: 'store.sqlite',
        iosDatabaseLocation: 'default'
      });
      ionic.Platform.exitApp();
    });
  };

};

module.controller('DeveloperController', DeveloperController);
