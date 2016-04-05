'use strict';

var module = angular.module('fxe.controllers.friends', []);

var FriendsController = function ($scope, $state, $ionicHistory, storeService) {

  $scope.friends = storeService.getFriends();
  $scope.range = null;
  $scope.loggedIn = null;
  $scope.meID = storeService.getUser().id;

  var enter = function () {
    $scope.range = 'last';
    $scope.loggedIn = storeService.isLoggedIn();
  };

  $scope.changeRange = function (range) {
    $scope.range = range;
  };

  $scope.hasFriends = function () {
    return Object.keys($scope.friends).length != 0;
  };

  $scope.goto = function (target) {
    // handle "Login" button
    $ionicHistory.nextViewOptions({
      historyRoot: true,
    });
    $state.go(target);
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
