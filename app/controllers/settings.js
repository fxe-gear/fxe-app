'use strict';

var module = angular.module('fxe.controllers.settings', []);

var SettingsController = function ($scope, $state, $ionicPlatform, $ionicPopup, $ionicHistory, storeService, syncService, diffWatch) {

  // copy store user to $scope.user
  $scope.user = {};
  angular.merge($scope.user, storeService.getUser());

  var disableUserWatcher = angular.noop;

  var enter = function () {
    // add $scope.user watcher
    disableUserWatcher = diffWatch($scope, 'user', onUserChange);

    // load loggedIn and paired
    $scope.loggedIn = storeService.isLoggedIn();
    $scope.paired = storeService.isPaired();
  };

  var leave = function () {
    disableUserWatcher();
  };

  // TODO show progress
  var sync = function () {
    // console.log(storeService.getUserChanges());
    if (!$scope.loggedIn) return;

    return syncService.syncUser()
      .then(function () {
        disableUserWatcher(); // disable
        angular.merge($scope.user, storeService.getUser()); // copy changes
        disableUserWatcher = diffWatch($scope, 'user', onUserChange); // enable
      })
      .catch(function (error) {
        // TODO handle server side validation errors
        $ionicPopup.alert({
          title: 'Account synchronization failed.',
          okType: 'button-assertive',
        });
      });
  };

  var onUserChange = function (changes) {
    // pass the changes to storeService
    angular.merge(storeService.getUserChanges(), changes.updated);
    sync();
  };

  $scope.goto = function (target) {
    // handle "Login" and "Connect my FXE" buttons
    $ionicHistory.nextViewOptions({
      historyRoot: true,
    });
    $state.go(target);
  };

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterLeave', leave);
};

module.controller('SettingsController', SettingsController);
