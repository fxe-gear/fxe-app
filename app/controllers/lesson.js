'use strict';

var module = angular.module('fxe.controllers.lesson', []);

// interval used in diff graph (in milliseconds)
module.constant('diffGraphInterval', 120 * 1e3);

var LessonController = function ($scope, $cordovaSocialSharing, $ionicPopup, lessonService, diffGraphInterval, msToDateFilter, dateFilter, lesson, shuffle, userService) {
  var tips = {
    jumping: [
      'When you jump on a high intensity. Focus on impacting on flat foot. That way you will save you will put less stress on your calves and put it on your thighs. That way you will be able to perform better and longer.',
      'With low intensity steps focus on impacting with your tip toe first. Your ankle will slow-down the impact on the trampoline and you will get more control over your movements.',
      'When you\'re feeling unstable when jumping multiple times on single leg. Squeeze your abdominal muscles by pushing your belly-button towards your spine. This way you will engage your deep-core muscles, which will help you re-gain balance.',
      'When you are using the handlebars keep in mind to not use the handlebars as a support for your body, neither to grab them. Remember that the correct position is to put your forearm around your elbow on the bars. Bend your knees and keep your center of gravity in the center of the trampoline.',
      'High intensity exercises are all about abdominals. When you jump never forget to pull your lower-body high and push your upper-body down at the same time (work like a pump). This will make your exercise much more precise, stable and many more times effective!',
      'Any time you jump with your legs apart, always keep them at the width of your shoulders. Check your position every once in a while and keep the right spread. Spreading your legs wider does not make jumping any more effective and it might cause a dull pain in your abductors.',
      'Jumping® Fitness trampoline is designed to provide the best performance and most effective exercise, but you need to use it correctly. Keep yourself always in the center of the trampoline in order to maximize the effectiveness of Jumping®.'
    ],
    running: [
      'When ever you run, always remember to mix cardio trots with fast pace sprints. It will ensure that your jogging sessions will always be effective fat burning exercise.',
      'Correct technique while running is most essential. Always try to impact with your toes slightly sooner that the rest of your foot. It might slow you down from the start, but slapping the ground with your whole foot or your heel can damage your knees, causing you to be unable to run further.',
      'When trotting try to keep yourself straight up. This way you will be able to control you balance and your run will be much lighter.',
      'Control over your arms in a key component of the perfect run. Keep your elbows bend at all times and do not swing your arms around.'
    ]
  };

  var line = {
    values: [],
    key: 'score'
  };
  var chart = {
    type: 'lineChart',
    isArea: true,
    height: 250,
    duration: 500,
    margin: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 20
    },
    xAxis: {
      tickFormat: d3.time.format('%H:%M')
    },
    xScale: d3.time.scale(),
    yAxis: {
      ticks: 5
    },
    forceY: [0, 20],
    interactive: false,
    showLabels: false,
    showLegend: false,
    interpolate: 'cardinal'
  };

  $scope.chartOptions = {
    chart: chart
  };
  $scope.chartData = [line];

  // var share = function () {
  //   // TODO Facebook for Android not working! http://ngcordova.com/docs/plugins/socialSharing/
  //   // share image instead
  //   var message = 'My jumping score in last lesson was ' + $scope.lesson.score.toFixed(0) + '!';
  //   $cordovaSocialSharing.share(message).catch(function (error) {
  //     // sharing result is nonsense boolean (see https://goo.gl/XYpqiQ) so we only catch errors
  //     $ionicPopup.alert({
  //       title: 'Sharing failed.',
  //       template: 'Please try it again.',
  //       okType: 'button-assertive'
  //     });
  //     throw error;
  //   });
  // };
    var message = 'My jumping score in last lesson was ' + lesson.score.toFixed(0) + '!';
   // var link = "http://www.fxe-gear.com/en/lesson/detail?l="+lesson.start+"&u="+userService.getUser().id;
    var link = "http://dev17.nexgen.cz/en/lesson/detail?l="+lesson.start+"&u="+userService.getUser().id;
   // console.log(link);

    $scope.share = function () {
        $cordovaSocialSharing.shareViaFacebook(message, link, null);
    };

    var prepareChartData = function () {
    // limit number of intervals for lessons longer than two hours
    var limitLessonLength = 3600 * 1e3;

    var interval = (lesson.duration < limitLessonLength) ? diffGraphInterval : (diffGraphInterval * lesson.duration / limitLessonLength);

    lessonService.getLessonDiffData(lesson.start, interval).then(function (data) {
        data = data.filter(function (val, i, a) {
            var numbefore = false;
            var numAfter = false;
            (a.slice(0, i)).forEach(function (val) {
               if (val > 0)
                 numbefore = true;
            });

            (a.slice(i, a.length - 1)).forEach(function (val) {
                if (val > 0)
                    numAfter = true;
            });

            if (numbefore && numAfter) {
                return true;
            } else {
                return val > 0;
            }
        });

        for (var i = 0; i <= data.length; i++) {
            line.values.push({
                x: msToDateFilter(i * interval),
                y: i == 0 ? 0 : data[i - 1]
            });
        }
    });
  };

  $scope.lesson = lesson;
  $scope.$on('$ionicView.beforeEnter', function () {
    prepareChartData();
    $scope.tip = lesson.sport == 1 ? shuffle(tips.jumping)[0] : shuffle(tips.running)[0];
  });

  var getTrophy = function (lesson) {
        var minutes = Math.floor(lesson.duration / 1000 / 60);
        var scorePerMinute = lesson.score / minutes;

        if ( scorePerMinute >  1.6 && minutes > 40 && scorePerMinute < 2 ) {
            return "bronze";
        } else if (scorePerMinute > 2 && scorePerMinute < 2.5 && minutes > 40 ) {
            return "silver";
        } else if ( scorePerMinute > 2.5 && minutes > 40 ) {
            return "gold";
        }
    };

    $scope.trophy = getTrophy(lesson);
};

module.controller('LessonController', LessonController);
