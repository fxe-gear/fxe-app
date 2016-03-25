'use strict';

var module = angular.module('experience.controllers.settings', []);

var SettingsController = function ($scope, $state, $ionicPlatform, $ionicHistory, storeService, userService, diffWatch) {

  $scope.user = storeService.getUser();
  var userWatcher;

  var enter = function () {
    // load loggedIn and paired
    $scope.loggedIn = storeService.isLoggedIn();
    $scope.paired = storeService.isPaired();

    // add user watcher
    userWatcher = diffWatch($scope, 'user', onUserChange);
  };

  var leave = function () {
    // clear user watcher
    userWatcher();
  };

  var onUserChange = function (changes) {
    // pass the changes to userService
    // TODO show progress
    userService.updateAccount(changes.updated).catch(function (error) {
      // TODO handle server side validation errors
      $ionicPopup.alert({
        title: 'Updating account failed.',
        okType: 'button-assertive',
      });
    });
  };

  $scope.goto = function (target) {
    // handle "Login" and "Connect my Experience" buttons
    $ionicHistory.nextViewOptions({
      historyRoot: true,
    });
    $state.go(target);
  };

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterLeave', leave);
};

module.controller('SettingsController', SettingsController);
