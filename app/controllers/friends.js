'use strict';

var module = angular.module('experience.controllers.friends', []);

var FriendsController = function ($scope, $ionicPlatform, storeService, userService) {
  $scope.friends = storeService.getUser().friends;

  var loadUserItem = function () {

    // get current week
    var startDate = new Date();
    var endDate = new Date();
    var weekDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - weekDay);
    endDate.setDate(endDate.getDate() + 6 - weekDay);

    // load lessons between startDate and endDate
    storeService.getLessonsBetween(startDate.getTime(), endDate.getTime()).then(function (lessons) {
      var score = 0;
      var duration = 0;

      // sum score and duration
      for (var i = 0; i < lessons.length; i++) {
        score += lessons[i].score;
        duration += lessons[i].duration;
      }

      $scope.friends.facebook.push({
        id: 'me',
        name: storeService.getUser().name,
        score: score,
      });

    });
  };

  $ionicPlatform.ready(function () {
    if (storeService.getUser().provider == 'facebook') {
      userService.loadFriendsFacebook();
    }

    // loadUserItem();
  });
};

module.controller('FriendsController', FriendsController);
