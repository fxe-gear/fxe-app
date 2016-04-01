'use strict';

var module = angular.module('fxe.controllers.lesson', []);

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

    storeService.getLessonDiffData(lesson.start, interval).then(function (data) {

      var makeXtick = function (val) {
        return dateFilter(msToDateFilter(val), 'HH:mm');
      };

      var chart = {
        type: 'lineChart',
        height: 220,
        margin: {
          top: 20,
          right: 20,
          bottom: 60,
          left: 40,
        },
        xAxis: {
          tickFormat: makeXtick,
          axisLabel: 'time',
        },
        yAxis: {
          axisLabel: 'score',
          axisLabelDistance: -20,
        },
        yDomain: [0, 50],
        interactive: false,
        showLabels: false,
        showLegend: false,
        interpolate: 'basis',
        duration: 400,
        attr: {
          width: function (d, i) {
            return d.x;
          },
        },
      };

      var line = {
        values: [],
        key: '+ score in ' + (diffGraphInterval / 1e3) + 's',
      };

      line.values.push({
        x: 0,
        y: 0,
      });

      for (var i = 1; i <= data.length; i++) {
        line.values.push({
          x: i * interval,
          y: data[i - 1],
        });
      }

      $scope.chartOptions = {
        chart: chart,
      };
      $scope.chartData = [line];

    });
  };

  $scope.share = share;
  $scope.lesson = lesson;
  $scope.$on('$ionicView.beforeEnter', function () {
    prepareChartData();
  });
};

module.controller('LessonController', LessonController);
