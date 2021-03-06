'use strict';

var module = angular.module('fxe.controllers.start', []);

module.filter('sumScore', function () {
  return function (score) {
    var lastScoreItems = {}, res = 0;

    // save the last score item for each score type
    angular.forEach(score, function (scoreItem) {
      lastScoreItems[scoreItem.type] = scoreItem;
    });

    // sum all last score items together
    angular.forEach(lastScoreItems, function (lastScoreItem) {
      res += lastScoreItem.score;
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

var StartController = function ($scope, $rootScope, $state, $ionicPopup, $ionicPopover, $interval, $localStorage, fxeService, eventService, lessonService, userService) {
  var timer = null;
  var batteryPopup = null;

  var $storage = $localStorage.$default({
    lesson: {
      start: null,
      sport: null,
      event: null,
      end: null,
      score: []
    }
  });

  $scope.lesson = $storage.lesson;
  $scope.running = false;
  $scope.connected = false;
  $scope.status = 'reconnecting';
  $scope.sport = 1;
  $scope.event = null;
  $scope.isLoggedIn = userService.isLoggedIn;

  $scope.connectedWatcher = angular.noop;
  $scope.disconnectedWatcher = angular.noop;
  $scope.batteryWatcher = angular.noop;

  $ionicPopover.fromTemplateUrl('main/start/events.html', {
    scope: $scope
  }).then(function (popover) {
    $scope.popover = popover;
  });

  $scope.changeSport = function (sport) {
    $scope.sport = sport;
    $scope.event = null;
  };

  $scope.getDuration = function () {
    // return elapsed time from start of measurement (in milliseconds)
    return $scope.lesson.start ? Date.now() - $scope.lesson.start : 0;
  };

  $scope.start = function () {
    startNewLesson();
    startMeasurement();
  };

  var startNewLesson = function () {
    $scope.lesson.sport = $scope.sport;
    $scope.lesson.event = $scope.event ? $scope.event.id : null;
    $scope.lesson.start = Date.now();
  };

  var startMeasurement = function () {
    return fxeService.startMeasurement($scope.sport, onScoreChanged)
      .then(function () {
        $scope.running = true;
        timer = $interval(angular.noop, 500); // just to update duration
      })
      .catch(function (error) {
        $ionicPopup.alert({
          title: 'Starting measurement failed.',
          okType: 'button-assertive'
        });
        throw error;
      });
  };

  var onScoreChanged = function (score, type) {
    var scoreItem = {
      score: score,
      type: type,
      time: Date.now()
    };
    $scope.lesson.score.push(scoreItem);
  };

  $scope.stop = function () {
    $scope.lesson.end = Date.now();
    stopMeasurement()
      .then(function () {
        return lessonService.addLesson($scope.lesson);
      })
      .then(function () {
        // clean lesson
        $scope.lesson.start = null;
        $scope.lesson.sport = null;
        $scope.lesson.event = null;
        $scope.lesson.end = null;
        $scope.lesson.score.length = 0;
        $localStorage.$apply();
        return $state.go('main.history');
      });
  };

  var stopMeasurement = function () {
    return fxeService.stopMeasurement($scope.sport)
      .then(function () {
        $interval.cancel(timer);
        $scope.running = false;
      })
      .catch(function (error) {
        $ionicPopup.alert({
          title: 'Stopping measurement failed.',
          okType: 'button-assertive'
        });
        throw error;
      });
  };

  $scope.showEvents = function ($event) {
    return eventService.getEvents($scope.sport)
      .then(function (events) {
        $scope.events = events;
        return $scope.popover.show($event);
      })
      .catch(function (error) {
        $ionicPopup.alert({
          title: 'Getting events failed.',
          okType: 'button-assertive'
        });
        throw error;
      })
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

  // hide GUI overlay and display measuring screen
  var onConnect = function () {
    fxeService.getMeasuredSport()
      .then(function (sport) {
        if (sport) {
          $scope.sport = sport;
          return startMeasurement();
        }
      })
      .then(function () {
        // delay setting of $scope.connected due to GUI overlay after start
        $scope.connected = true;
      })
      .then(fxeService.enableBatteryWarning);
  };

  var onDisconnect = function () {
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
    // watch for state changes
    $scope.connectedWatcher = $rootScope.$on('bleConnected', onConnect);
    $scope.disconnectedWatcher = $rootScope.$on('bleDisconnected', onDisconnect);
    $scope.batteryWatcher = $rootScope.$on('fxeBatteryLow', onBatteryLow);

    // hold connection (for now and future)
    fxeService.holdConnection();
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
  $rootScope.$on('bleEnablingStarted', function () {
    $scope.status = 'enabling';
  });
  $rootScope.$on('bleScanningStarted', function () {
    $scope.status = 'scanning';
  });
  $rootScope.$on('bleConnectingStarted', function () {
    $scope.status = 'connecting';
  });
};

module.controller('StartController', StartController);
