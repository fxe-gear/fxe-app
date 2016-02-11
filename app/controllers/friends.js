'use strict';

var module = angular.module('experience.controllers.friends', []);

var FriendsController = function ($scope, storeService, userService) {
  $scope.friends = storeService.getUser().friends;

  $scope.$on('$ionicView.beforeEnter', function () {
    if (storeService.getUser().provider == 'facebook') {
      userService.loadFriendsFacebook();
    }
  });
};

module.controller('FriendsController', FriendsController);
