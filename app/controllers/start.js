'use strict';

var module = angular.module('fxe.controllers.start', []);

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
        $animate.addClass(elem, 'fresh')
          .then(function () {
            timer = $timeout(function () {
              $animate.removeClass(elem, 'fresh');
            }, 500);
          });
      }
    });
  };
});

module.constant('eventLimit', 3);

var StartController = function ($scope, $rootScope, $state, $ionicPlatform, $ionicPopup, $ionicPopover, $interval, fxeService, bleDevice, apiService, storeService, syncService, eventLimit) {
  var timer = null;
  var batteryPopup = null;

  $scope.running = false;
  $scope.connected = false;
  $scope.status = 'reconnecting';
  $scope.lesson = null;
  $scope.type = 1;
  $scope.event = null;

  $scope.connectedWatcher = angular.noop;
  $scope.disconnectedWatcher = angular.noop;
  $scope.batteryWatcher = angular.noop;

  $ionicPopover.fromTemplateUrl('events.html', {
    scope: $scope
  }).then(function (popover) {
    $scope.popover = popover;
  });

  $scope.changeType = function (type) {
    $scope.type = type;
  };

  $scope.getDuration = function () {
    // return elapsed time from start of measurement (in milliseconds)
    return $scope.lesson ? $scope.lesson.start != null ? Date.now() - $scope.lesson.start : 0 : 0;
  };

  $scope.start = function () {
    return fxeService.startMeasurement($scope.type, $scope.event ? $scope.event.id : null)
      .then(function () {
        $scope.lesson = storeService.getCurrentLesson();
        $scope.running = true;
        timer = $interval(angular.noop, 1000); // just to update duration
      });
  };

  $scope.showEvents = function ($event) {
    return apiService.getEvents(eventLimit)
      .then(function (response) {
        $scope.popover.show($event);
        $scope.events = response.data;
      });
  };

  $scope.joinEvent = function (id) {
    $scope.popover.hide();

    // used by cancel button
    if (!id) {
      $scope.event = null;
      return;
    }

    // select event by ID
    for (var i = 0; i < $scope.events.length; i++) {
      if ($scope.events[i].id == id) {
        $scope.event = $scope.events[i];
        return;
      }
    }
  };

  $scope.stop = function () {
    fxeService.stopMeasurement()
      .then(function () {
        // TODO go to nested state
        // https://gist.github.com/Deminetix/f7e0d9b91b685df5fc0d
        // http://codepen.io/TimothyKrell/pen/bnukj?editors=101
        return $state.go('main.history');
      })
      .then(function () {
        $interval.cancel(timer);
        $scope.running = false;
        // return syncService.syncLessons();
      });
  };

  // hide GUI overlay and display measuring screen
  var onFxeConnected = function () {
    fxeService.isMeasuring()
      .then(function (measuring) {
        if (measuring) return $scope.start();
      })
      .then(function () {
        // delay setting of $scope.connected due to GUI overlay after start
        $scope.connected = true;
      })
      .then(fxeService.enableBatteryWarning);
  };

  var onFxeDisconnected = function () {
    $scope.status = 'reconnecting';
    $scope.connected = false;
  };

  var onBatteryLow = function (event, level) {
    if (batteryPopup) {
      batteryPopup.close();
    }

    batteryPopup = $ionicPopup.alert({
      title: (level * 100).toFixed(0) + '% of battery remains',
      template: 'Please charge your FXE soon.',
      okType: 'button-energized'
    });
  };

  $scope.$on('$ionicView.beforeEnter', function () {
    // get current state
    bleDevice.isConnected()
      .then(function (connected) {
        if (connected) onFxeConnected();
        else onFxeDisconnected();
      });

    // watch for state changes
    $scope.connectedWatcher = $rootScope.$on('fxeConnected', onFxeConnected);
    $scope.disconnectedWatcher = $rootScope.$on('fxeDisconnected', onFxeDisconnected);
    $scope.batteryWatcher = $rootScope.$on('fxeBatteryLow', onBatteryLow);
  });

  $scope.$on('$ionicView.afterLeave', function () {
    // disable watchers
    $scope.connectedWatcher();
    $scope.connectedWatcher = angular.noop;
    $scope.disconnectedWatcher();
    $scope.disconnectedWatcher = angular.noop;
    $scope.batteryWatcher();
    $scope.batteryWatcher = angular.noop;
  });

  $scope.$on('$destroy', function () {
    $scope.popover.remove();
  });

  // update text in overlay
  $rootScope.$on('fxeEnablingStarted', function () {
    $scope.status = 'enabling';
  });

  $rootScope.$on('fxeScanningStarted', function () {
    $scope.status = 'scanning';
  });

  $rootScope.$on('fxeConnectingStarted', function () {
    $scope.status = 'connecting';
  });

  $ionicPlatform.ready(function () {
    // hold connection (for now and future)
    if (storeService.isPaired()) {
      bleDevice.holdConnection();
    }

    // sync data
    // if (storeService.isLoggedIn()) {
    //   syncService.syncAll();
    // }
  });
};

module.controller('StartController', StartController);
