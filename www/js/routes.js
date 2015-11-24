angular.module('experience.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider.state('welcome', {
    url: '/welcome',
    templateUrl: 'templates/welcome.html',
    controller: 'WelcomeController',
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

  // TODO different application flow

  $urlRouterProvider.otherwise('/welcome');

});
