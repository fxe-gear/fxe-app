'use strict';

var module = angular.module('experience.controllers.friends', []);

var FriendsController = function ($scope, $ionicPlatform, storeService, userService) {
  $scope.friends = storeService.getFriends();

  $scope.$on('$ionicView.beforeEnter', function () {
    $ionicPlatform.ready().then(userService.reloadFriends);
  });

};

module.controller('FriendsController', FriendsController);
