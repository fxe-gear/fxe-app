'use strict';

var module = angular.module('experience.controllers.jumping', [
  'experience.services.experience',
  'experience.services.store',
]);

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

var JumpingController = function($scope, $state, $ionicPlatform, $ionicLoading, $ionicHistory, $interval, $timeout, experienceService, storeService) {
  var timer = null;

  $scope.running = false;
  $scope.connected = false;
  $scope.lesson = null;

  $scope.getDuration = function() {
    // return elapsed time from start of measurement (in milliseconds)
    return $scope.lesson ? $scope.lesson.startTime != null ? Date.now() - $scope.lesson.startTime : 0 : 0;
  };

  $scope.start = function() {
    return experienceService.startMeasurement().then(function() {
      $scope.lesson = storeService.getCurrentLesson();
      $scope.running = true;
      timer = $interval($scope.apply, 1000);
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
    });
  };

  // callback displaying GUI overlay and start / stop screen
  var connectionStateChanged = function(connected) {
    if (!connected) {
      $scope.connected = false;

    } else {
      experienceService.isMeasuring().then(function(measuring) {
        if (measuring) return $scope.start();
      }).then(function() {
        // delay setting of $scope.connected due to GUI overlay after start
        $scope.connected = connected;
      });
    }
  };

  $scope.$on('$ionicView.beforeEnter', function() {
    // get current state
    experienceService.isConnected().then(connectionStateChanged);
  });

  $ionicPlatform.ready(function() {
    // listen for future state changes
    $scope.$on('experienceConnectionStateChanged', function(e, state) {
      connectionStateChanged(state);
    });

    // and ensure experience is connected for both, now and future
    experienceService.holdConnectionState(true);
  });
};

module.controller('JumpingController', JumpingController);
