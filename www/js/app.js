angular.module('experience', [
  'ionic',
  'ngCordova',
  'experience.controllers',
  'experience.routes',
  'experience.services',
])

.run(function($ionicPlatform, $rootScope, $state) {
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
  });

  document.addEventListener('resume', function(event) {
    $rootScope.$broadcast('resume');
  });

  document.addEventListener('pause', function(event) {
    $rootScope.$broadcast('pause');
  });

  // when live reload is triggered
  window.onbeforeunload = function(e) {
    $state.go('welcome');
  };

});
