'use strict';

var module = angular.module('experience.controllers.history', []);

module.constant('historyChartLength', {
  days: 14,
  months: 12,
});

var HistoryController = function ($scope, storeService, dateFilter, historyChartLength) {
  $scope.user = storeService.getUser();
  $scope.historyChartLength = historyChartLength;
  $scope.lessons = null;
  $scope.average = null;
  $scope.grouping = null;

  var startDate = null;
  var endDate = null;
  var allLessonCount = 0;

  // requires $scope.grouping to be set
  var shiftStartDate = function () {
    startDate = new Date(endDate);

    if ($scope.grouping == 'days') {
      startDate.setDate(startDate.getDate() - historyChartLength.days);
    } else if ($scope.grouping == 'months') {
      startDate.setMonth(startDate.getMonth() - historyChartLength.months, 1);
    }

    // start of the day
    startDate.setHours(0, 0, 0, 0);
  };

  var groupingFn = {
    days: function (d1, d2) {
      return (d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },

    months: function (d1, d2) {
      return (d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },
  };

  // requires $scope.lessons to be set
  var fillChartData = function () {

    $scope.chartLabels = [];
    $scope.chartData = [
      [],
    ];

    // oldest lesson
    var currentLesson = $scope.lessons.length - 1;

    // setup for cycle
    var date = new Date(startDate);

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

  // requires $scope.lessons to be set
  var fillAverages = function () {
    $scope.average = {
      score: 0,
      duration: 0,
    };

    for (var i = 0; i < $scope.lessons.length; i++) {
      var lesson = $scope.lessons[i];
      $scope.average.score += lesson.score;
      $scope.average.duration += lesson.duration;
    }

    if ($scope.lessons.length) {
      // to prevent zero division
      $scope.average.score /= $scope.lessons.length;
      $scope.average.duration /= $scope.lessons.length;
    }
  };

  $scope.canLoadMore = function () {
    return $scope.lessons.length < allLessonCount;
  };

  $scope.loadMore = function () {
    shiftStartDate();

    // load lessons for this date interval
    var promise = storeService.getLessonsBetween(startDate.getTime(), endDate.getTime()).then(function (lessons) {
      console.log('loadMore res', lessons);
      for (var i = 0; i < lessons.length; i++) $scope.lessons.push(lessons[i]);
      $scope.$broadcast('scroll.infiniteScrollComplete');
    });

    endDate = startDate;
    return promise;
  };

  $scope.changeGrouping = function (type) {
    $scope.grouping = type;
    $scope.lessons = [];
    endDate = new Date();
    $scope.loadMore().then(function () {
      fillChartData();
      fillAverages();
    });
  };

  $scope.$on('$ionicView.beforeEnter', function () {
    $scope.changeGrouping('days');
    storeService.getLessonCount().then(function (count) {
      allLessonCount = count;
    });
  });
};

module.controller('HistoryController', HistoryController);
