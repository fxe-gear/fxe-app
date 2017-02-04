'use strict';

var module = angular.module('fxe', [
  'ionic',
  'ngCordova',
  'ngStorage',
  'nvd3',

  'fxe.services.logging',
  'fxe.services.util',
  'fxe.services.user',
  'fxe.services.lesson',
  'fxe.services.api',
  'fxe.services.sync',
  'fxe.services.event',
  'fxe.services.friend',
  'fxe.services.token',
  'fxe.services.bleApi',
  'fxe.services.ble',
  'fxe.services.fxe',

  'fxe.controllers.welcome',
  'fxe.controllers.createAccount',
  'fxe.controllers.history',
  'fxe.controllers.friends',
  'fxe.controllers.start',

  'fxe.controllers.lesson',
  'fxe.controllers.login',
  'fxe.controllers.pairing',
  'fxe.controllers.scanning',
  'fxe.controllers.settings',
  'fxe.controllers.developer',
  'fxe.controllers.about',
  'fxe.controllers.passwordReset',
  'fxe.controllers.firmwareUpgrade',

  'fxe.directives.account',
  'fxe.directives.error',

  'fxe.routes',
  'fxe.templates'
]);

module.config(function ($qProvider) {
  $qProvider.errorOnUnhandledRejections(false);
});

// TODO make automatic from package.json or config.xml
module.constant('appVersion', '1.0.3');

module.run(function ($ionicConfig, $ionicPlatform, $ionicHistory, $rootScope, lessonService, fxeService, syncService) {

  $ionicPlatform.ready().then(function () {
    console.debug('platform ready fired');

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
    if (StatusBar) {
      StatusBar.styleLightContent();
    }

    // prepare DB
    lessonService.prepareDB();

    // sync data
    syncService.syncAll();

    // save "android" / "ios" variable to rootScope
    $rootScope.platform = ionic.Platform.platform();
  });

  // disconnect device if needed
  var disconnect = function () {
    return fxeService.disconnect();
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
  document.addEventListener('resume', function () {
    $rootScope.$broadcast('resume');
  });

  // app paused (to background)
  document.addEventListener('pause', function () {
    $rootScope.$broadcast('pause');
  });

  // related to live reload
  window.onbeforeunload = function (e) {
    disconnect();
    $rootScope.$broadcast('liveunload');
    // must explicitly return
    // noinspection UnnecessaryReturnStatementJS
    return;
  };

  // related to live reload
  window.onload = function (e) {
    $rootScope.$broadcast('livereload');
  };

});
