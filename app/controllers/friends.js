'use strict';

var module = angular.module('fxe.controllers.friends', []);

var FriendsController = function ($scope, $state, $ionicHistory, userService, friendService, syncService) {

  $scope.friends = friendService.getFriends();
  $scope.user = userService.getUser();
  $scope.range = null;
  $scope.sport = null;
  $scope.isLoggedIn = userService.isLoggedIn;

  var enter = function () {
    $scope.range = 'last';
    $scope.changeSport(1);
  };

  $scope.changeRange = function (range) {
    $scope.range = range;
  };

  $scope.changeSport = function (sport) {
    $scope.sport = sport;
    syncService.syncFriends($scope.sport);
  };

  $scope.hasFriends = function () {
    return Object.keys($scope.friends).length != 0;
  };

  $scope.goto = function (target) {
    // handle "Login" button
    $ionicHistory.nextViewOptions({
      historyRoot: true
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
      if (range == 'last') {
        return b.score.last - a.score.last;
      } else {
        return b.score.sum[range] - a.score.sum[range];
      }
    });

    return filtered;
  };
});

module.controller('FriendsController', FriendsController);
