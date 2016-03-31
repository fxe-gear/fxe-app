'use strict';

var module = angular.module('fxe.controllers.friends', []);

var FriendsController = function ($scope, storeService) {

  $scope.friends = storeService.getFriends();
  $scope.range = null;
  $scope.loggedIn = null;

  var enter = function () {
    $scope.range = 'last';
    $scope.loggedIn = storeService.isLoggedIn();
  };

  $scope.changeRange = function (range) {
    $scope.range = range;
  };

  $scope.$on('$ionicView.beforeEnter', enter);

};

module.filter('orderByScoreDesc', function () {
  return function (items, range) {
    var filtered = [];
    angular.forEach(items, function (item) {
      filtered.push(item);
    });

    filtered.sort(function (a, b) {
      return b.score[range] - a.score[range];
    });

    return filtered;
  };
});

module.controller('FriendsController', FriendsController);
