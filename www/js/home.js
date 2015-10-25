angular.module('experience.home', [])

.controller('HomeController', function($scope, $rootScope) {
    $scope.performance = Math.floor(Math.random() * 100) + 80;

    $scope.share = function() {
        var text = 'My Jumping® performance in my latest lesson was ' + $scope.performance + ' #JumpingExperience';
        if (window.plugins && window.plugins.socialsharing) {
            window.plugins.socialsharing.share(text);
        } else {
            console.log('Sharing: ' + text);
        }
    };

    $rootScope.transparentToolbar = 1;

    console.log('HomeController loaded');
});
