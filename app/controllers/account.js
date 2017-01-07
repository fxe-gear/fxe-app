'use strict';

var module = angular.module('fxe.controllers.account', []);

var CreateAccountController = function ($scope, $state, $cordovaToast, $ionicHistory, $ionicPopup, storeService, userService) {

  $scope.user = storeService.getUser();

  $scope.create = function () {
    userService.createAccount()
      .then(function () {
        return $cordovaToast.showShortBottom('Account created.');
      }).then(function () {
        $ionicHistory.nextViewOptions({
          historyRoot: true
        });
        $state.go('scanning');
      }).then(function () {
        userService.loadDetails();
      }).catch(function (error) {
        // TODO handle server side validation errors
        $ionicPopup.alert({
          title: 'Creating account failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };

};

module.controller('CreateAccountController', CreateAccountController);
