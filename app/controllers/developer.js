'use strict';

var module = angular.module('fxe.controllers.developer', []);

var DeveloperController = function ($scope, $state, $localStorage, $cordovaSQLite, $ionicPopup, fxeService, bleDevice, storeService) {

  $localStorage.$default({
    websocket: {
      ip: '127.0.0.1',
      port: 8237,
    },
  });
  $scope.extremesSubscribed = false;
  $scope.websocket = $localStorage.websocket;

  $scope.toggleSubscribeExtremes = function () {
    var action;

    if (!$scope.extremesSubscribed) {
      action = fxeService.subscribeExtremes($scope.websocket.ip, $scope.websocket.port);
    } else {
      action = fxeService.unsubscribeExtremes();
    }

    action.then(function () {
      $scope.extremesSubscribed = !$scope.extremesSubscribed;
    });
  };

  $scope.getBatteryLevel = function () {
    fxeService.getBatteryLevel().then(function (level) {
      $ionicPopup.alert({
        title: 'Battery level',
        template: (level * 100).toFixed(0) + '%',
      });
    });
  };

  $scope.dumpDB = function () {
    storeService._dumpDB();
  };

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
        iosDatabaseLocation: 'default',
      });
      ionic.Platform.exitApp();
    });
  };

};

module.controller('DeveloperController', DeveloperController);
