'use strict';

angular.module('experience.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider.state('welcome', {
    url: '/welcome',
    templateUrl: 'templates/welcome.html',
    controller: 'WelcomeController',
  });

  $stateProvider.state('create-account', {
    url: '/create-account',
    templateUrl: 'templates/create-account.html',
    controller: 'CreateAccountController',
  });

  $stateProvider.state('login', {
    url: '/login',
    templateUrl: 'templates/login.html',
    controller: 'LoginController',
  });

  $stateProvider.state('scanning', {
    url: '/scanning',
    templateUrl: 'templates/scanning.html',
    controller: 'ScanningController',
  });

  $stateProvider.state('pairing', {
    url: '/pairing',
    templateUrl: 'templates/pairing.html',
    controller: 'PairingController',
  })

  .state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main/main.html',
  })

  .state('main.start', {
    url: '/start',
    views: {
      jump: {
        templateUrl: 'templates/main/start.html',
        controller: 'StartController',
      },
    },
  })

  .state('main.jumping', {
    url: '/jumping',
    views: {
      jump: {
        templateUrl: 'templates/main/jumping.html',
        controller: 'JumpingController',
      },
    },
  })

  .state('main.me', {
    url: '/me',
    abstract: true,
    views: {
      me: {
        templateUrl: 'templates/main/me/me.html',
      },
    },
  })

  .state('main.me.last', {
    url: '/last',
    views: {
      lesson: {
        templateUrl: 'templates/main/me/last.html',
        controller: 'LessonController',
      },
    },
  })

  ;

  $urlRouterProvider.otherwise(function($injector, $location) {
    var userService = $injector.get('userService');
    var experienceService = $injector.get('experienceService');

    if (experienceService.isPaired() && userService.isLoggedIn())
      return '/main/start';
    if (!experienceService.isPaired() && userService.isLoggedIn())
      return '/scanning';
    else
      return '/welcome';
  });

});
