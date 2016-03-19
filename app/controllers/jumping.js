'use strict';

var module = angular.module('experience.controllers.jumping', []);

module.filter('sumScore', function () {
  return function (score) {
    var res = 0;
    angular.forEach(score, function (part) { // acumulate score
      res += part;
    });

    return res;
  };
});

module.directive('animateOnChange', function ($animate, $timeout) {
  var timer = null;
  return function (scope, elem, attr) {
    scope.$watch(attr.animateOnChange, function (nv, ov) {
      if (nv != ov) { // if value differs
        $timeout.cancel(timer); // cancel old timer if running
        $animate.addClass(elem, 'fresh').then(function () {
          timer = $timeout(function () {
            $animate.removeClass(elem, 'fresh');
          }, 500);
        });
      }
    });
  };
});

var JumpingController = function ($scope, $rootScope, $state, $ionicPlatform, $ionicPopup, $interval, $timeout, experienceService, storeService) {
  var timer = null;
  var batteryPopup = null;

  $scope.running = false;
  $scope.connected = false;
  $scope.status = 'reconnecting';
  $scope.lesson = null;

  $scope.getDuration = function () {
    // return elapsed time from start of measurement (in milliseconds)
    return $scope.lesson ? $scope.lesson.startTime != null ? Date.now() - $scope.lesson.startTime : 0 : 0;
  };

  $scope.start = function () {
    return experienceService.startMeasurement().then(function () {
      $scope.lesson = storeService.getCurrentLesson();
      $scope.running = true;
      timer = $interval($scope.apply, 1000);
    });
  };

  $scope.stop = function () {
    experienceService.stopMeasurement().then(function () {
      $interval.cancel(timer);

      // TODO go to nested state
      // https://gist.github.com/Deminetix/f7e0d9b91b685df5fc0d
      // http://codepen.io/TimothyKrell/pen/bnukj?editors=101
      $state.go('main.history').then(function () {
        $scope.running = false;
      });
    });
  };

  // hide GUI overlay and display measuring screen
  var onExperienceConnected = function () {
    experienceService.isMeasuring().then(function (measuring) {
      if (measuring) return $scope.start();
    }).then(function () {
      // delay setting of $scope.connected due to GUI overlay after start
      $scope.connected = true;
    });
  };

  var onExperienceDisconnected = function () {
    $scope.status = 'reconnecting';
    $scope.connected = false;
  };

  var onBatteryLow = function (event, level) {
    if (batteryPopup) {
      batteryPopup.close();
    }

    batteryPopup = $ionicPopup.alert({
      title: (level * 100).toFixed(0) + '% of battery remains',
      template: 'Please charge your Experience soon.',
      okType: 'button-energized',
    });
  };

  $scope.$on('$ionicView.beforeEnter', function () {
    // get current state
    $ionicPlatform.ready()
      .then(experienceService.isConnected)
      .then(function (connected) {
        if (connected) onExperienceConnected();
        else onExperienceDisconnected();
      });
  });

  // listen for future state changes
  $rootScope.$on('experienceConnected', onExperienceConnected);
  $rootScope.$on('experienceDisconnected', onExperienceDisconnected);
  $rootScope.$on('experienceBatteryLow', onBatteryLow);

  // update text in overlay
  $rootScope.$on('experienceEnablingStarted', function () {
    $scope.status = 'enabling';
  });

  $rootScope.$on('experienceScanningStarted', function () {
    $scope.status = 'scanning';
  });

  $rootScope.$on('experienceConnectingStarted', function () {
    $scope.status = 'connecting';
  });

  // and ensure experience is connected for both, now and future
  $ionicPlatform.ready(experienceService.holdConnection);
};

module.controller('JumpingController', JumpingController);
