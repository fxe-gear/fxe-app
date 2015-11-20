angular.module('experience.controllers', [])

.controller('WelcomeController', function($scope, $cordovaOauth, OAuthKeyFB) {

    $scope.facebookLogin = function() {
        $cordovaOauth.facebook(OAuthKeyFB, ["email", "public_profile"], {redirect_uri: "http://localhost/callback"}).then(function(result) {
            alert("logged in");
        }, function(error) {
            alert("Error: " + error);
        });
    };

    console.log('WelcomeController loaded');
});
