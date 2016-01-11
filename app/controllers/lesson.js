'use strict';

var module = angular.module('experience.controllers.lesson', [
  'experience.services.store',
  'experience.services.util',
  'chart.js',
]);

// interval used in diff graph (in seconds)
module.constant('diffGraphInterval', 90);

var LessonController = function($scope, storeService, diffGraphInterval, msToTimeSpanFilter, dateFilter, lesson) {

  $scope.lesson = lesson;

  var msToLabel = function(val) {
    return dateFilter(msToTimeSpanFilter(val), 'HH:mm:ss');
  };

  var prepareChartData = function() {
    storeService.getLessonDiffData(lesson.startTime, diffGraphInterval).then(function(data) {

      // fill labels
      $scope.chartLabels = [];
      for (var i = 0; i <= data.length; i++) {
        $scope.chartLabels.push(msToLabel(i * diffGraphInterval * 1e3)); // in milliseconds
      }

      // fill score
      $scope.chartData = [[0]];
      for (var i = 0; i < data.length; i++) {
        $scope.chartData[0].push(data[i]);
      }

    });
  };

  $scope.$on('$ionicView.beforeEnter', function() {
    prepareChartData();
  });
};

module.controller('LessonController', LessonController);
