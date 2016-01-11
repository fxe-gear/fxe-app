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

  $stateProvider.state('main.history', {
    url: '/history',
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

  $stateProvider.state('main.settings', {
    url: '/settings',
    views: {
      settings: {
        templateUrl: 'templates/main/settings.html',
        controller: 'SettingsController',
      },
    },
  });

  $urlRouterProvider.otherwise(function($injector, $location) {
    var userService = $injector.get('userService');
    var storeService = $injector.get('storeService');

    if (storeService.isPaired())
      return '/main/jumping';
    if (!storeService.isPaired() && userService.isLoggedIn())
      return '/scanning';
    else
      return '/welcome';
  });

});
