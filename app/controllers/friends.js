'use strict';

var module = angular.module('experience.controllers.friends', []);

var FriendsController = function ($scope, $ionicPlatform, storeService, userService) {
  $scope.friends = storeService.getUser().friends;

  $ionicPlatform.ready(function () {
    if (storeService.getUser().provider == 'facebook') {
      userService.loadFriendsFacebook();
    }
  });
};

module.controller('FriendsController', FriendsController);
