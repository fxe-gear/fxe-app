'use strict';

var module = angular.module('experience.controllers.lesson', [
  'experience.services.store',
  'experience.services.util',
  'chart.js',
]);

// interval used in diff graph (in seconds)
module.constant('diffGraphInterval', 90);

var LessonController = function($scope, $cordovaSocialSharing, $ionicPopup, $cordovaToast, storeService, diffGraphInterval, msToTimeSpanFilter, dateFilter, lesson) {

  var share = function() {
    // TODO Facebook for Android not working! http://ngcordova.com/docs/plugins/socialSharing/
    // share image instead
    var message = 'My jumping score in last lesson was ' + $scope.lesson.score.toFixed(0) + '!';
    $cordovaSocialSharing.share(message).catch(function(error) {
      // sharing result is nonsense boolean (see https://goo.gl/XYpqiQ) so we only catch errors
      $ionicPopup.alert({
        title: 'Sharing failed.',
        template: 'Please try it again.',
        okType: 'button-assertive',
      });
      throw error;
    });
  };

  var msToLabel = function(val) {
    return dateFilter(msToTimeSpanFilter(val), 'HH:mm:ss');
  };

  var prepareChartData = function() {
    storeService.getLessonDiffData(lesson.startTime, diffGraphInterval).then(function(data) {

      // fill labels
      $scope.chartLabels = [];
      for (var i = 0; i < data.length + 1; i++) { // add one label after data
        $scope.chartLabels.push(msToLabel(i *  diffGraphInterval * 1e3)); // in milliseconds
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
  $scope.$on('$ionicView.beforeEnter', function() {
    prepareChartData();
  });
};

module.controller('LessonController', LessonController);
