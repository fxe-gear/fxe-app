'use strict';

var module = angular.module('experience.controllers.history', []);

module.constant('historyChartLength', {
  days: 14,
  months: 12,
});

var HistoryController = function ($scope, storeService, dateFilter, historyChartLength) {
  $scope.user = storeService.getUser();
  $scope.historyChartLength = historyChartLength;
  $scope.lessons = [];
  $scope.average = {
    score: 0,
    duration: 0,
  };
  $scope.grouping = 'days';

  var initialDate = null;

  var groupingFn = {
    days: function (d1, d2) {
      return (d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },

    months: function (d1, d2) {
      return (d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },
  };

  // requires $scope.grouping to be set
  var computeInitialDate = function () {
    initialDate = new Date();
    if ($scope.grouping == 'days') {
      initialDate.setDate(initialDate.getDate() - historyChartLength.days);
    } else if ($scope.grouping == 'months') {
      initialDate.setMonth(initialDate.getMonth() - historyChartLength.months, 1);
    }

    // start of the day
    initialDate.setHours(0, 0, 0, 0);
  };

  // requires $scope.lessons to be set
  var prepareChartData = function () {

    $scope.chartLabels = [];
    $scope.chartData = [
      [],
    ];

    // oldest lesson
    var currentLesson = $scope.lessons.length - 1;

    // setup for cycle
    var date = new Date(initialDate);
    var today = new Date();

    do {
      // take all lessons for this group and sum their score
      var sum = 0;
      for (; currentLesson >= 0 && groupingFn[$scope.grouping](date, new Date($scope.lessons[currentLesson].startTime)); currentLesson--) {
        sum += $scope.lessons[currentLesson].score;
      }

      $scope.chartData[0].push(sum.toFixed(0));

      // generate date group and add label
      if ($scope.grouping == 'days') {
        $scope.chartLabels.push(dateFilter(date, 'shortDate'));
        date.setDate(date.getDate() + 1);
      } else if ($scope.grouping == 'months') {
        $scope.chartLabels.push(dateFilter(date, 'MMM y'));
        date.setMonth(date.getMonth() + 1);
      }

    } while (currentLesson >= 0);

  };

  var computeAverages = function () {
    $scope.average.score = 0;
    $scope.average.duration = 0;

    for (var i = 0; i < $scope.lessons.length; i++) {
      var lesson = $scope.lessons[i];
      $scope.average.score += lesson.score;
      $scope.average.duration += lesson.duration;
    }

    $scope.average.score /= $scope.lessons.length;
    $scope.average.duration /= $scope.lessons.length;
  };

  $scope.changeGrouping = function (type) {
    $scope.grouping = type;
    computeInitialDate();
    storeService.getLessonsBetween(initialDate.getTime(), new Date().getTime()).then(function (lessons) {
      $scope.lessons = lessons;
      prepareChartData();
      computeAverages();
    });
  };

  $scope.$on('$ionicView.beforeEnter', function () {
    $scope.changeGrouping('days');
  });
};

module.controller('HistoryController', HistoryController);
