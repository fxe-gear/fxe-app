'use strict';

var module = angular.module('fxe.controllers.createAccount', []);

var CreateAccountController = function ($scope, $state, $cordovaToast, $ionicHistory, $ionicPopup, userService, syncService) {

  $scope.user = userService.getUser();

  $scope.create = function () {
    userService.createAccount()
      .then(function () {
        return $cordovaToast.showShortBottom('Account created.');
      })
      .then(gotoScanning)
      .then(syncService.syncUser)
      .catch(function () {
        // TODO handle server side validation errors
        $ionicPopup.alert({
          title: 'Creating account failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };

  var gotoScanning = function () {
    $ionicHistory.nextViewOptions({
      historyRoot: true
    });
    return $state.go('scanning');
  };

};

module.controller('CreateAccountController', CreateAccountController);
