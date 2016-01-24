'use strict';

var module = angular.module('experience.controllers.developer', [
  'experience.services.store',
  'experience.services.experience',
  'ngCordova',
  'ngStorage',
]);

var DeveloperController = function($scope, $state, $localStorage, $cordovaSQLite, experienceService, storeService) {

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

  $scope.unpair = function() {
    experienceService.unpair().then(experienceService.disconnect).then(function() {
      $state.go('scanning');
    });
  };

  $scope.clearAll = function() {
    $localStorage.$reset();
    $cordovaSQLite.deleteDB({
      name: 'store.sqlite',
    });
    experienceService.disconnect().then(function() {
      $state.go('welcome');
    });
  };

};

module.controller('DeveloperController', DeveloperController);
