'use strict';

var module = angular.module('experience.controllers.lesson', []);

// interval used in diff graph (in miliseconds)
module.constant('diffGraphInterval', 120 * 1e3);

var LessonController = function ($scope, $cordovaSocialSharing, $ionicPopup, storeService, diffGraphInterval, msToDateFilter, dateFilter, lesson) {

  var share = function () {
    // TODO Facebook for Android not working! http://ngcordova.com/docs/plugins/socialSharing/
    // share image instead
    var message = 'My jumping score in last lesson was ' + $scope.lesson.score.toFixed(0) + '!';
    $cordovaSocialSharing.share(message).catch(function (error) {
      // sharing result is nonsense boolean (see https://goo.gl/XYpqiQ) so we only catch errors
      $ionicPopup.alert({
        title: 'Sharing failed.',
        template: 'Please try it again.',
        okType: 'button-assertive',
      });
      throw error;
    });
  };

  var prepareChartData = function () {
    // limit number of intervals for lessons longer than two hours
    var limitLessonLength = 3600 * 1e3;
    var interval = (lesson.duration < limitLessonLength) ? diffGraphInterval : (diffGraphInterval * lesson.duration / limitLessonLength);

    storeService.getLessonDiffData(lesson.startTime, interval).then(function (data) {

      var makeLabel = function (val) {
        return dateFilter(msToDateFilter(val), (lesson.duration > 3600 * 1e3) ? 'HH:mm:ss' : 'mm:ss');
      };

      // fill labels
      $scope.chartLabels = [];
      for (var i = 0; i < interval * (data.length + 1); i += interval) { // add one label after data
        $scope.chartLabels.push(makeLabel(i));
      }

      // fill score
      $scope.chartData = [
        [0],
      ];
      for (var i = 0; i < data.length; i++) {
        $scope.chartData[0].push(data[i]);
      }

    });
  };

  $scope.share = share;
  $scope.lesson = lesson;
  $scope.$on('$ionicView.beforeEnter', function () {
    prepareChartData();
  });
};

module.controller('LessonController', LessonController);
