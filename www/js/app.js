angular.module('experience', [
  'ionic',
  'experience.home'
])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  .state('home', {
    url: '/home',
    views: {
      'content': {
        templateUrl: 'templates/home.html',
        controller: 'HomeController'
      }
    },
  });

  $urlRouterProvider.otherwise('/home');
});

