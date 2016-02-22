'use strict';

var module = angular.module('experience.controllers.history', []);

var HistoryController = function ($scope, $ionicPlatform, $cordovaDatePicker, storeService, dateFilter, ordinalFilter) {
  $scope.user = storeService.getUser();
  $scope.lessons = [];
  $scope.summary = {
    score: 0,
    duration: 0,
  };
  $scope.range = null;

  $scope.startDate = null;
  $scope.endDate = null;
  var allLessonCount = 0;

  // requires $scope.range to be set
  var computeDateRange = function (base) {
    $scope.startDate = new Date(base);
    $scope.endDate = new Date(base);

    if ($scope.range == 'week') {
      var weekDay = $scope.startDate.getDay();
      $scope.startDate.setDate($scope.startDate.getDate() - weekDay);
      $scope.endDate.setDate($scope.endDate.getDate() + 6 - weekDay);

    } else if ($scope.range == 'month') {
      $scope.startDate.setDate(1);
      $scope.endDate.setMonth($scope.endDate.getMonth() + 1, 0);

    } else if ($scope.range == 'year') {
      $scope.startDate.setMonth(0, 1);
      $scope.endDate.setMonth(12, 0);
    }

    // start / end of the day
    $scope.startDate.setHours(0, 0, 0, 0);
    $scope.endDate.setHours(23, 59, 59, 999);
  };

  var isSame = {
    day: function (d1, d2) {
      return (d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },

    month: function (d1, d2) {
      return (d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },
  };

  var groupingFn = {
    week: isSame.day,
    month: isSame.day,
    year: isSame.month,
  };

  // requires $scope.lessons to be set
  var fillChart = function () {

    $scope.chartLabels = [];
    $scope.chartData = [
      [],
    ];

    // oldest lesson
    var currentLesson = $scope.lessons.length - 1;

    // setup for cycle
    var end = false;
    var date = new Date($scope.startDate);

    do {
      // grouping fn returns true for endDate => end chart (last column)
      if (groupingFn[$scope.range](date, $scope.endDate)) end = true;

      // take all lessons for this group and sum their score
      var sum = 0;
      for (; currentLesson >= 0 && groupingFn[$scope.range](date, new Date($scope.lessons[currentLesson].startTime)); currentLesson--) {
        sum += $scope.lessons[currentLesson].score;
      }

      $scope.chartData[0].push(sum.toFixed(0));

      // generate date group and add label
      if ($scope.range == 'week') {
        $scope.chartLabels.push(dateFilter(date, 'MM/dd'));
        date.setDate(date.getDate() + 1);

      } else if ($scope.range == 'month') {
        $scope.chartLabels.push(dateFilter(date, 'd') + ordinalFilter(date.getDate()));
        date.setDate(date.getDate() + 1);

      } else if ($scope.range == 'year') {
        $scope.chartLabels.push(dateFilter(date, 'MMM'));
        date.setMonth(date.getMonth() + 1);
      }

    } while (!end);

  };

  // requires $scope.lessons to be set
  var fillSummary = function () {
    $scope.summary.score = 0;
    $scope.summary.duration = 0;

    for (var i = 0; i < $scope.lessons.length; i++) {
      var lesson = $scope.lessons[i];
      $scope.summary.score += lesson.score;
      $scope.summary.duration += lesson.duration;
    }
  };

  var reloadLessons = function () {
    $scope.lessons.length = 0;

    // load lessons for current date interval
    storeService.getLessonsBetween($scope.startDate.getTime(), $scope.endDate.getTime()).then(function (lessons) {
      for (var i = 0; i < lessons.length; i++) $scope.lessons.push(lessons[i]);
      fillChart();
      fillSummary();
    });
  };

  $scope.changeRange = function (range) {
    $scope.range = range;
    if (!$scope.startDate) $scope.startDate = new Date();

    // alternative solution (resets date every time when switching between ranges)
    // computeDateRange($scope.startDate);
    computeDateRange(new Date());

    reloadLessons();
  };

  $scope.changeDate = function () {
    var options = {
      date: $scope.startDate,
      todayText: 'Today',
      androidTheme: 5, // nice calendar widget
    };
    $cordovaDatePicker.show(options).then(function (date) {
      computeDateRange(date);
      reloadLessons();
    });
  };

  $scope.shiftRange = function (offset) {
    if ($scope.range == 'week') {
      $scope.startDate.setDate($scope.startDate.getDate() + 7 * offset);
      $scope.endDate.setDate($scope.endDate.getDate() + 7 * offset);
    } else if ($scope.range == 'month') {
      $scope.startDate.setMonth($scope.startDate.getMonth() + offset, 1);
      $scope.endDate.setMonth($scope.endDate.getMonth() + offset + 1, 0);
    } else if ($scope.range == 'year') {
      $scope.startDate.setFullYear($scope.startDate.getFullYear() + offset);
      $scope.endDate.setFullYear($scope.endDate.getFullYear() + offset);
    }

    reloadLessons();
  };

  // TODO refresh when new lesson was added
  $ionicPlatform.ready(function () {
    $scope.changeRange('week');
  });

};

module.controller('HistoryController', HistoryController);
