'use strict';

angular.module('fxe.routes', [])

.config(function ($stateProvider, $urlRouterProvider) {

  $stateProvider.state('welcome', {
    url: '/welcome',
    templateUrl: 'welcome.html',
    controller: 'WelcomeController',
  });

  $stateProvider.state('create-account', {
    url: '/create-account',
    templateUrl: 'create-account.html',
    controller: 'CreateAccountController',
  });

  $stateProvider.state('login', {
    url: '/login',
    templateUrl: 'login.html',
    controller: 'LoginController',
  });

  $stateProvider.state('password-reset', {
    url: '/password-reset',
    templateUrl: 'password-reset.html',
    controller: 'PasswordResetController',
  });

  $stateProvider.state('scanning', {
    url: '/scanning',
    templateUrl: 'scanning.html',
    controller: 'ScanningController',
  });

  $stateProvider.state('pairing', {
    url: '/pairing',
    templateUrl: 'pairing.html',
    controller: 'PairingController',
  });

  $stateProvider.state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'main/main.html',
  });

  $stateProvider.state('main.jumping', {
    url: '/jumping',
    views: {
      jump: {
        templateUrl: 'main/jumping.html',
        controller: 'JumpingController',
      },
    },
  });

  $stateProvider.state('main.history', {
    url: '/history',
    views: {
      me: {
        templateUrl: 'main/me/history.html',
        controller: 'HistoryController',
      },
    },
  });

  $stateProvider.state('main.lesson', {
    url: '/lesson?start',
    views: {
      me: {
        templateUrl: 'main/me/lesson.html',
        controller: 'LessonController',
        resolve: {
          lesson: function ($stateParams, storeService) {
            if ($stateParams.start)
              return storeService.getLesson($stateParams.start);
            else
              return storeService.getLastLesson();
          },
        },
      },
    },
  });

  $stateProvider.state('main.friends', {
    url: '/friends',
    views: {
      friends: {
        templateUrl: 'main/friends/friends.html',
        controller: 'FriendsController',
      },
    },
  });

  $stateProvider.state('main.settings', {
    url: '/settings',
    views: {
      settings: {
        templateUrl: 'main/settings/settings.html',
        controller: 'SettingsController',
      },
    },
  });

  $stateProvider.state('main.developer', {
    url: '/settings/developer',
    views: {
      settings: {
        templateUrl: 'main/settings/developer.html',
        controller: 'DeveloperController',
      },
    },
  });

  $stateProvider.state('main.about', {
    url: '/settings/about',
    views: {
      settings: {
        templateUrl: 'main/settings/about.html',
        controller: 'AboutController',
      },
    },
  });

  $urlRouterProvider.otherwise(function ($injector, $location) {
    var storeService = $injector.get('storeService');

    if (storeService.isPaired())
      return '/main/jumping';
    else
      return '/scanning';
    // if (!storeService.isPaired() && storeService.isLoggedIn())
    //   return '/scanning';
    // else
    //   return '/welcome';
  });

});
