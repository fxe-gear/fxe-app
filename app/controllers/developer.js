'use strict';

var module = angular.module('fxe.controllers.developer', []);

var DeveloperController = function ($scope, $state, $localStorage, $cordovaSQLite, fxeService) {

  $scope.getBatteryLevel = function () {
    fxeService.getBatteryLevel()
      .then(function (level) {
        alert('Battery level is ' + (level * 100).toFixed(0) + '%');
      });
  };

  $scope.disconnect = fxeService.disconnect;
  $scope.reconnect = fxeService.reconnect;
  $scope.disableConnectionHolding = fxeService.disableConnectionHolding;

  $scope.upgradeFirmware = function () {
    $state.go('firmware-upgrade');
  };

  $scope.unpair = function () {
    if (!confirm('Really?')) return;

    fxeService.unpair();
    return fxeService.disconnect()
      .finally(function () {
        return $state.go('scanning');
      });
  };

  $scope.clearAll = function () {
    if (!confirm('Really?')) return;

    return fxeService.disconnect()
      .finally(function () {
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
