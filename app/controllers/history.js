'use strict';

var module = angular.module('experience.controllers.history', []);

module.constant('historyChartLength', {
  days: 14,
  months: 12,
});

var HistoryController = function ($scope, storeService, dateFilter, historyChartLength) {
  $scope.user = storeService.getUser();
  $scope.lessons = null;
  $scope.historyChartLength = historyChartLength;
  $scope.grouping = null;

  var groupingFn = {
    days: function (d1, d2) {
      return (d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },

    months: function (d1, d2) {
      return (d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    },
  };

  var prepareChartData = function () {

    $scope.chartLabels = [];
    $scope.chartData = [
      [],
    ];

    var currentLesson = $scope.lessons.length - 1; // oldest lesson

    // set initial date
    var day = new Date();
    if ($scope.grouping == 'days') {
      day.setDate(day.getDate() - historyChartLength.days);
    } else if ($scope.grouping == 'months') {
      day.setMonth(day.getMonth() - historyChartLength.months, 1);
    }

    var numberOfGroups = $scope.grouping == 'days' ? historyChartLength.days : historyChartLength.months;
    for (var i = 0; i < numberOfGroups; i++) {

      // generate date group and add label
      if ($scope.grouping == 'days') {
        day.setDate(day.getDate() + 1);
        $scope.chartLabels.push(dateFilter(day, 'shortDate'));
      } else if ($scope.grouping == 'months') {
        day.setMonth(day.getMonth() + 1);
        $scope.chartLabels.push(dateFilter(day, 'MMM y'));
      }

      // take all lessons for this group and sum their score
      var sum = 0;
      for (; currentLesson >= 0 && groupingFn[$scope.grouping](day, new Date($scope.lessons[currentLesson].startTime)); currentLesson--) {
        sum += $scope.lessons[currentLesson].score;
      }

      $scope.chartData[0].push(sum.toFixed(0));
    }
  };

  $scope.changeGrouping = function (type) {
    $scope.grouping = type;
    prepareChartData();
  };

  $scope.$on('$ionicView.beforeEnter', function () {
    storeService.getAllLessons().then(function (lessons) {
      $scope.lessons = lessons;
      $scope.changeGrouping('days');
    });
  });
};

module.controller('HistoryController', HistoryController);
