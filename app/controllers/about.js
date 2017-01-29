'use strict';

var module = angular.module('fxe.controllers.about', []);

var AboutController = function ($scope, $localStorage, fxeService) {

  var clickCount = 0;
  var $storage = $localStorage;
  $scope.firmwareVersion = null;

  $scope.becomeDeveloper = function () {
    clickCount++;
    $storage.isDeveloper = $storage.isDeveloper || clickCount >= 5;
  };

  $scope.isDeveloper = function () {
    return $storage.isDeveloper;
  };

  $scope.getFirmwareVersion = function () {
    fxeService.getFirmwareVersion()
      .then(function (version) {
        $scope.firmwareVersion = version;
      })
      .catch(function () {
        $scope.firmwareVersion = 'unable to get version';
      });
  };

};

module.controller('AboutController', AboutController);
