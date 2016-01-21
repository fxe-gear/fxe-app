'use strict';

var module = angular.module('experience.controllers.settings', [
  'experience.services.experience',
  'ngCordova',
  'ngStorage',
]);

var SettingsController = function($scope, $state, $localStorage, $cordovaSQLite, experienceService) {

  $localStorage.$default({
    websocket: {
      ip: '127.0.0.1',
      port: 8237,
    },
  });
  $scope.extremesSubscribed = false;
  $scope.websocket = $localStorage.websocket;

  $scope.toggleSubscribeExtremes = function() {
    var action;

    if (!$scope.extremesSubscribed) {
      action = experienceService.subscribeExtremes($scope.websocket.ip, $scope.websocket.port);
    } else {
      action = experienceService.unsubscribeExtremes();
    }

    action.then(function() {
      $scope.extremesSubscribed = !$scope.extremesSubscribed;
    });
  };

  $scope.clearAll = function() {
    $localStorage.$reset();
    $cordovaSQLite.deleteDB({
      name: 'store.sqlite',
    });
    experienceService.isConnected().then(function(connected) {
      if (connected) experienceService.disconnect();
    }).then(function() {
      $state.go('welcome');
    });
  };

};

module.controller('SettingsController', SettingsController);
