angular.module('experience.controllers', [])

.controller('WelcomeController', function($scope, $state, userService) {
  $scope.user = userService.model;

  $scope.loginOAuth = function(provider) {
    // pick methods by provider
    if (provider == 'facebook') {
      var oauth = userService.oauthFacebook;
      var load = userService.loadFromFacebook;
    } else {
      var oauth = userService.oauthGoogle;
      var load = userService.loadFromGoogle;
    }

    // fire login
    oauth()
    .then(load)
    .then(userService.saveState)
    .then(function(model) {
      $state.go('pairing');
    }).catch(function(error) {
      // TODO inform user
    });
  };
})

.controller('PairingController', function() {
});
