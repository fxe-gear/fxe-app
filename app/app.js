'use strict';

angular.module('fxe', [
  'ionic',
  'talis.services.logging',
  'ngCordova',
  'ngStorage',
  'ngWebSocket',
  'nvd3',

  'fxe.services.util',
  'fxe.services.user',
  'fxe.services.store',
  'fxe.services.api',
  'fxe.services.sync',
  'fxe.services.ble',
  'fxe.services.fxe',

  'fxe.controllers.welcome',
  'fxe.controllers.account',
  'fxe.controllers.history',
  'fxe.controllers.friends',
  'fxe.controllers.jumping',
  'fxe.controllers.lesson',
  'fxe.controllers.login',
  'fxe.controllers.pairing',
  'fxe.controllers.scanning',
  'fxe.controllers.settings',
  'fxe.controllers.developer',
  'fxe.controllers.about',
  'fxe.controllers.reset',

  'fxe.directives.account',
  'fxe.directives.error',

  'fxe.routes',
  'fxe.templates',
])

.run(function ($ionicConfig, $ionicPlatform, $ionicHistory, $rootScope, storeService, bleDevice, fxeService) {

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

    // save "android" / "ios" variable to rootScope
    $rootScope.platform = ionic.Platform.platform();
  });

  // disconnect device if needed
  var disconnect = function () {
    return bleDevice.isConnected().then(function (connected) {
      if (connected) {
        return fxeService.disableBatteryWarning().then(bleDevice.disconnect);
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
