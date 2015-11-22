angular.module('experience.controllers', [])

.controller('WelcomeController', function($scope, $state, $cordovaToast, $log, userService) {
  $scope.user = userService.model;

  $scope.loginFacebook = function() {
    userService.loginFacebook()
    .then(userService.loadFromFacebook)
    .then(userService.saveState)
    .then(function() {
      $state.go('pairing');
    }).catch(function(error) {
      $cordovaToast.showShortCenter('Facebook login failed. Please try again.');
    });
  };

  $scope.loginGoogle = function() {
    userService.loginGoogle()
    .then(userService.loadFromGoogle)
    .then(userService.saveState)
    .then(function() {
      $state.go('pairing');
    }).catch(function(error) {
      $cordovaToast.showShortCenter('Google login failed. Please try again.');
    });
  };

})

.controller('PairingController', function() {
});
