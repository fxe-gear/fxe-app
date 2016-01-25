'use strict';

var module = angular.module('experience.controllers.jumping', [
  'experience.services.experience',
  'experience.services.store',
]);

module.constant('reconnectTimeout', 3000); // in milliseconds

module.filter('sumScore', function() {
  return function(score) {
    var res = 0;
    angular.forEach(score, function(part) { // acumulate score
      res += part;
    });

    return res;
  };
});

module.directive('animateOnChange', function($animate, $timeout) {
  var timer = null;
  return function(scope, elem, attr) {
    scope.$watch(attr.animateOnChange, function(nv, ov) {
      if (nv != ov) { // if value differs
        $timeout.cancel(timer); // cancel old timer if running
        $animate.addClass(elem, 'fresh').then(function() {
          timer = $timeout(function() {
            $animate.removeClass(elem, 'fresh');
          }, 500);
        });
      }
    });
  };
});

var JumpingController = function($scope, $state, $ionicPlatform, $ionicHistory, $interval, $timeout, experienceService, storeService, reconnectTimeout) {
  var timer = null;

  $scope.running = false;
  $scope.connected = false;
  $scope.lesson = null;

  $scope.getDuration = function() {
    // return elapsed time from start of measurement (in milliseconds)
    return $scope.lesson.startTime != null ? Date.now() - $scope.lesson.startTime : 0;
  };

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

  $scope.start = function() {
    experienceService.startMeasurement().then(function() {
      $scope.lesson = storeService.getCurrentLesson();
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
