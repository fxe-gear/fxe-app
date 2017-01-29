'use strict';

var module = angular.module('fxe.controllers.settings', []);

var SettingsController = function ($scope, $state, $ionicPopup, $cordovaToast, $ionicHistory, userService, fxeService, syncService, diffWatch) {

  $scope.user = {};
  $scope.isLoggedIn = userService.isLoggedIn;
  $scope.isPaired = fxeService.isPaired;

  var disableUserWatcher = angular.noop;

  var enableUserWatcher = function () {
    // add $scope.user watcher
    disableUserWatcher = diffWatch($scope, 'user', onUserChange);
  };

  var onUserChange = function (changes) {
    // pass the changes to userService
    angular.merge(userService.getUserChanges(), changes.updated);
  };

  var reloadUser = function () {
    // copy fresh user data to $scope.user
    angular.merge($scope.user, userService.getUser());
  };

  var enter = function () {
    reloadUser();
    enableUserWatcher();
    syncService.syncUser();
  };

  var leave = function () {
    disableUserWatcher();
  };

  $scope.sync = function (form) {
    form.syncInProgress = true;

    return syncService.syncUser()
      .then(function () {
        disableUserWatcher();
        reloadUser();
        enableUserWatcher();
        form.$setPristine();
        return $cordovaToast.showShortBottom('Saved.');
      })
      .catch(function () {
        // TODO handle server side validation errors
        $ionicPopup.alert({
          title: 'Account synchronization failed.',
          okType: 'button-assertive'
        });
      })
      .finally(function () {
        form.syncInProgress = false;
      })
  };

  $scope.goto = function (target) {
    // handle "Login" and "Connect my FXE" buttons
    $ionicHistory.nextViewOptions({
      historyRoot: true
    });
    $state.go(target);
  };

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterLeave', leave);
};

module.controller('SettingsController', SettingsController);
