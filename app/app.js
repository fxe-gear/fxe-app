'use strict';

angular.module('experience', [
  'ionic',
  'talis.services.logging',
  'ngCordova',
  'ngStorage',
  'ngWebSocket',
  'chart.js',

  'experience.services.util',
  'experience.services.user',
  'experience.services.store',
  'experience.services.api',
  'experience.services.sync',
  'experience.services.ble',
  'experience.services.experience',

  'experience.controllers.welcome',
  'experience.controllers.account',
  'experience.controllers.history',
  'experience.controllers.friends',
  'experience.controllers.jumping',
  'experience.controllers.lesson',
  'experience.controllers.login',
  'experience.controllers.pairing',
  'experience.controllers.scanning',
  'experience.controllers.settings',
  'experience.controllers.developer',
  'experience.controllers.about',
  'experience.controllers.reset',

  'experience.directives.account',
  'experience.directives.error',

  'experience.routes',
  'experience.templates',
])

.run(function ($ionicConfig, $ionicPlatform, $ionicHistory, $rootScope, storeService, syncService, bleDevice, experienceService) {

  $ionicPlatform.ready(function () {
    // keyboard setup
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }

    if (ionic.Platform.platform() == 'ios') {
      $ionicConfig.scrolling.jsScrolling(true);

    } else if (ionic.Platform.platform() == 'android') {
      $ionicConfig.scrolling.jsScrolling(false);
    }

    // statusbar setup
    if (window.StatusBar) {
      StatusBar.styleLightContent();
    }

    // prepare DB
    storeService.prepareDB();

    // sync on app start
    if (storeService.isLoggedIn()) {
      syncService.syncAll();
    }

    // save "android" / "ios" variable to rootScope
    $rootScope.platform = ionic.Platform.platform();
  });

  // disconnect device if needed
  var disconnect = function () {
    return bleDevice.isConnected().then(function (connected) {
      if (connected) {
        return experienceService.disableBatteryWarning().then(bleDevice.disconnect);
      }
    });
  };

  $ionicPlatform.registerBackButtonAction(function (e) {
    e.preventDefault();

    if ($ionicHistory.backView()) {
      $ionicHistory.goBack();

    } else {
      // this is the history root: disconnect and exit
      disconnect();
      $rootScope.$broadcast('exit');
      ionic.Platform.exitApp();
    }

  }, 101);

  // app restored from background
  document.addEventListener('resume', function (event) {
    $rootScope.$broadcast('resume');
  });

  // app paused (to background)
  document.addEventListener('pause', function (event) {
    $rootScope.$broadcast('pause');
  });

  // related to live reload
  window.onbeforeunload = function (e) {
    disconnect();
    $rootScope.$broadcast('liveunload');
    return; // must explicitly return
  };

  // related to live reload
  window.onload = function (e) {
    $rootScope.$broadcast('livereload');
  };

});
