'use strict';

var module = angular.module('fxe.controllers.history', []);

var HistoryController = function ($scope, $ionicListDelegate, $cordovaDatePicker, lessonService, userService, syncService) {
  $scope.user = userService.getUser();
  $scope.lessons = [];
  $scope.summary = {
    score: 0,
    duration: 0
  };
  $scope.range = 'week';

  var jumpingBars = {
    values: [],
    key: 'Jumping'
  };
  var runningBars = {
    values: [],
    key: 'Running'
  };
  var chart = {
    type: 'multiBarChart',
    height: 250,
    margin: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 40
    },
    xAxis: {},
    yAxis: {
      tickFormat: function (num) {
        return num.toFixed(0);
      }
    },
    forceY: [0, 100],
    reduceXTicks: false,
    interactive: false,
    showLabels: false,
    showLegend: false,
    showControls: false,
    stacked: true,
    tooltip: {
      enabled: false
    }
  };
  $scope.chartOptions = {
    chart: chart
  };
  $scope.chartData = [jumpingBars, runningBars];

  $scope.startDate = null;
  $scope.endDate = null;

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
    }
  };

  var groupingFn = {
    week: isSame.day,
    month: isSame.day,
    year: isSame.month
  };

  // requires $scope.lessons to be set
  var fillChart = function () {

    jumpingBars.values.length = 0;
    runningBars.values.length = 0;

    // oldest lesson
    var currentLesson = $scope.lessons.length - 1;

    // setup for cycle
    var end = false;
    var date = new Date($scope.startDate);

    do {
      // grouping fn returns true for endDate => end chart (last column)
      if (groupingFn[$scope.range](date, $scope.endDate)) end = true;

      // take all lessons for this group and sum their score
      var sum = [0, 0]; // first index = jumping, second index = running
      for (; currentLesson >= 0 && groupingFn[$scope.range](date, new Date($scope.lessons[currentLesson].start)); currentLesson--) {
        var l = $scope.lessons[currentLesson];
        sum[l.sport == 1 ? 0 : 1] += l.score;
      }

      jumpingBars.values.push({
        x: new Date(date),
        y: sum[0]
      });

      runningBars.values.push({
        x: new Date(date),
        y: sum[1]
      });

      // generate date group and add label
      if ($scope.range == 'week') {
        date.setDate(date.getDate() + 1);

      } else if ($scope.range == 'month') {
        date.setDate(date.getDate() + 1);

      } else if ($scope.range == 'year') {
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

  var enter = function () {
    computeDateRange(new Date());
    return syncService.syncLessons().finally(reloadLessons);
  };

  var leave = function () {
    $ionicListDelegate.closeOptionButtons();
  };

  var reloadLessons = function () {
    // load lessons for current date interval
    return lessonService.getLessonsBetween($scope.startDate.getTime(), $scope.endDate.getTime())
      .then(function (lessons) {
        $scope.lessons.length = 0;
        for (var i = 0; i < lessons.length; i++) $scope.lessons.push(lessons[i]);

        // setup chart ticks
        if ($scope.range == 'week') {
          chart.xAxis.tickValues = d3.time.days($scope.startDate, $scope.endDate);
          chart.xAxis.tickFormat = d3.time.format('%m/%d');

        } else if ($scope.range == 'month') {
          chart.xAxis.tickValues = d3.time.weeks($scope.startDate, $scope.endDate);
          chart.xAxis.tickFormat = d3.time.format('%m/%d');

        } else if ($scope.range == 'year') {
          chart.xAxis.tickValues = d3.time.months($scope.startDate, $scope.endDate);
          chart.xAxis.tickFormat = d3.time.format('%b');
        }

        fillChart();
        fillSummary();
      });
  };

  $scope.changeRange = function (range) {
    $scope.range = range;

    // if (!$scope.startDate) $scope.startDate = new Date();
    // computeDateRange($scope.startDate);

    // alternative solution (resets date every time when switching between ranges)
    computeDateRange(new Date());

    reloadLessons();
  };

  $scope.changeDate = function () {
    var options = {
      date: $scope.startDate,
      todayText: 'Today',
      androidTheme: 5 // nice calendar widget
    };
    $cordovaDatePicker.show(options).then(function (date) {
      if (typeof date === 'undefined') {
        // iOS callback is success without param if canceled
        return;
      }

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

  $scope.delete = function (index, start) {
    $scope.lessons.splice(index, 1);
    lessonService.deleteLesson(start)
      .then(syncService.syncLessons)
      .finally(reloadLessons);
  };

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterLeave', leave);
};

module.controller('HistoryController', HistoryController);
