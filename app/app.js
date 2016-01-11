'use strict';

angular.module('experience', [
  'ionic',
  'experience.controllers',
  'experience.routes',
  'experience.services',
  'talis.services.logging',
])

.run(function($ionicConfig, $ionicPlatform, $rootScope, storeService, experienceService) {
  $ionicConfig.scrolling.jsScrolling(false);

  $ionicPlatform.ready(function() {
    // keyboard setup
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }

    // statusbar setup
    if (window.StatusBar) {
      StatusBar.styleLightContent();
    }

    // prepare DB
    storeService.prepareDB();

    // save "android" / "ios" variable to scope
    $rootScope.platform = ionic.Platform.platform();
  });

  // app restored from background
  document.addEventListener('resume', function(event) {
    $rootScope.$broadcast('resume');
  });

  // app paused (to background)
  document.addEventListener('pause', function(event) {
    $rootScope.$broadcast('pause');
  });

  // related to live reload
  window.onbeforeunload = function(e) {
    experienceService.isConnected().then(function(connected) {
      if (connected) experienceService.disconnect();
    });

    $rootScope.$broadcast('liveunload');
    return; // must explicitly return
  };

  // related to live reload
  window.onload = function(e) {
    $rootScope.$broadcast('livereload');
  };

});
