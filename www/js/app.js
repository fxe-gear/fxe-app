angular.module('experience', [
  'ionic',
  'ngCordova',
  'experience.controllers',
  'experience.routes',
  'experience.services',
])

.run(function($ionicPlatform, $rootScope) {
  $ionicPlatform.ready(function() {

    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }

    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    $rootScope.$broadcast('restorestate');
  });

  document.addEventListener('pause', function(event) {
    $rootScope.$broadcast('savestate');
  });
});
