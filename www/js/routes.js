angular.module('experience.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider.state('welcome', {
      url: '/welcome',
      templateUrl: 'templates/welcome.html',
      controller: 'WelcomeController'
    });

  $urlRouterProvider.otherwise('/welcome');

});
