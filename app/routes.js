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
  });

  $stateProvider.state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main/main.html',
  });

  $stateProvider.state('main.jumping', {
    url: '/jumping',
    views: {
      jump: {
        templateUrl: 'templates/main/jumping.html',
        controller: 'JumpingController',
      },
    },
  });

  $stateProvider.state('main.history', {
    url: '/history',
    cache: false,
    views: {
      me: {
        templateUrl: 'templates/main/me/history.html',
        controller: 'HistoryController',
        resolve: {
          lessons: function($stateParams, storeService) {
            return storeService.getAllLessons();
          },
        },
      },
    },
  });

  $stateProvider.state('main.lesson', {
    url: '/lesson?startTime',
    views: {
      me: {
        templateUrl: 'templates/main/me/lesson.html',
        controller: 'LessonController',
        resolve: {
          lesson: function($stateParams, storeService) {
            return $stateParams.startTime ? storeService.getLesson($stateParams.startTime) : storeService.getLastLesson();
          },
        },
      },
    },
  });

  $stateProvider.state('main.settings', {
    url: '/settings',
    views: {
      settings: {
        templateUrl: 'templates/main/settings/settings.html',
        controller: 'SettingsController',
      },
    },
  });

  $stateProvider.state('main.developer', {
    url: '/settings/developer',
    views: {
      settings: {
        templateUrl: 'templates/main/settings/developer.html',
        controller: 'DeveloperController',
      },
    },
  });

  $urlRouterProvider.otherwise(function($injector, $location) {
    var storeService = $injector.get('storeService');

    if (storeService.isPaired())
      return '/main/jumping';
    if (!storeService.isPaired() && storeService.isLoggedIn())
      return '/scanning';
    else
      return '/welcome';
  });

});
