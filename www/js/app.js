angular.module('experience', [
  'ionic',
  'ngCordova',
  'experience.controllers',
  'experience.routes',
  'experience.services',
])

.run(function($ionicPlatform, $rootScope, $state, experienceService) {
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

  $rootScope.$on('pause', function(e) {
    experienceService.stopScan();
    experienceService.disconnect();
    $state.go('welcome');
  });

  document.addEventListener('resume', function(event) {
    $rootScope.$broadcast('resume');
  });

  document.addEventListener('pause', function(event) {
    $rootScope.$broadcast('pause');
  });

  // related to live reload
  window.onbeforeunload = function(e) {
    $rootScope.$broadcast('pause');
  };

  // related to live reload
  window.onload = function(e) {
    $rootScope.$broadcast('resume');
  };

});
