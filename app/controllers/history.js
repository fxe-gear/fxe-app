'use strict';

var module = angular.module('experience.controllers.history', []);

var HistoryController = function($scope, storeService, dateFilter) {
  $scope.user = storeService.getUser();
  $scope.lessons = null;

  var prepareChartData = function() {
    var chartDayCount = 15; // in days

    var isSameDay = function(d1, d2) {
      return (d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear());
    };

    $scope.chartLabels = [];
    $scope.chartData = [
      [],
    ];

    var day = new Date();
    day.setDate(day.getDate() - chartDayCount);
    var currentLesson = $scope.lessons.length - 1;

    for (var i = 0; i < chartDayCount; i++) {
      day.setDate(day.getDate() + 1);
      $scope.chartLabels.push(dateFilter(day, 'shortDate'));

      // take all lessons for this day and sum their score
      var sum = 0;
      for (; currentLesson >= 0 && isSameDay(day, new Date($scope.lessons[currentLesson].startTime)); currentLesson--) {
        sum += $scope.lessons[currentLesson].score;
      }

      $scope.chartData[0].push(sum.toFixed(0));
    }
  };

  $scope.$on('$ionicView.beforeEnter', function() {
    storeService.getAllLessons().then(function(lessons) {
      $scope.lessons = lessons;
      prepareChartData();
    });
  });
};

module.controller('HistoryController', HistoryController);
