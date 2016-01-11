'use strict';

var module = angular.module('experience.controllers.jumping', [
  'experience.services.experience',
  'chart.js',
]);

module.constant('reconnectTimeout', 3000); // in milliseconds

var JumpingController = function($scope, $state, $ionicPlatform, $ionicHistory, $interval, $timeout, experienceService, reconnectTimeout) {
  var timer = null;

  $scope.running = false;
  $scope.connected = false;

  $scope.getElapsedTime = experienceService.getElapsedTime;

  var reconnect = function() {
    experienceService.enable()
    .then(experienceService.reconnect)
    .then(experienceService.isConnected).then(function(connected) {
      $scope.connected = connected;
      if (!connected) {
        throw 'not connected, but reconnect resolved successfully, don\'t know why';
      }
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout(reconnect, reconnectTimeout);
      throw error;
    });
  };

  $scope.getScore = function() {
    return experienceService.getCumulativeScore().toFixed(2);
  };

  $scope.start = function() {
    experienceService.startMeasurement().then(function() {
      $scope.running = true;
      timer = $interval($scope.apply, 1000);
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout(reconnect, reconnectTimeout);
      throw error;
    });
  };

  $scope.stop = function() {
    experienceService.stopMeasurement().then(function() {
      $interval.cancel(timer);

      // TODO go to nested state
      // https://gist.github.com/Deminetix/f7e0d9b91b685df5fc0d
      // http://codepen.io/TimothyKrell/pen/bnukj?editors=101
      $state.go('main.history').then(function() {
        $scope.running = false;
      });
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout(reconnect, reconnectTimeout);
      throw error;
    });
  };

  $ionicPlatform.ready(function() {
    reconnect();
  });
};

module.controller('JumpingController', JumpingController);
