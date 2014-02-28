angular.module('uberzeit-timer', ['ionic', 'ngResource'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('settings', {
      url: "/settings",
      templateUrl: "settings.html",
      controller: 'SettingsCtrl'
    })
    .state('timer', {
      url: "/timer",
      templateUrl: "timer.html",
      controller: 'TimerCtrl'
    })

    // if none of the above are matched, go to this one
    $urlRouterProvider.otherwise("/timer");
})

// {
//   "time_type_id": 1,
//   "date": "2014-02-27",
//   "start": "23:22",
//   "end": null,
//   "duration": "00:01"
// }
.factory('Timer', function($http, $resource, $q) {
  $http.defaults.headers.common['X-Auth-Token'] = localStorage.uberzeit_api_token;

  UberZeitTimer = $resource('https://uberzeit.nine.ch/api/timer.json',
                           null,
                           {
                             start: {method: 'POST', params: {time_type_id: 1}},
                             stop: {method: 'PUT', params: {end: 'now'}}
                           });

  return {
    timer: function() {
      deferred = $q.defer();
      UberZeitTimer.get(null,
                        function(response) {
                          deferred.resolve({ 'running': true, 'duration': response.duration, start: UberZeitTimer.start, stop: UberZeitTimer.stop });
                        },
                        function(reason) {
                          deferred.resolve({ 'running': false, 'duration': null, start: UberZeitTimer.start, stop: UberZeitTimer.stop });
                        });
      return deferred.promise;
    },
  }
})

.factory('Flash', function($rootScope) {
  return {
    message: '',
    setMessage: function(message) {
      this.message = message;
    }
  }
})

.factory('Page', function() {
  return {
    title: '',
    setTitle: function(title) {
      this.title = title;
    }
  };
})

.controller('MainCtrl', function($scope, $location, Flash, Page) {
  $scope.Flash = Flash;
  $scope.Page = Page;
  $scope.leftButtons = [{
    type: 'button-light',
    content: '<i class="icon ion-navicon"></i>',
    tap: function() {
      $scope.sideMenuController.toggleLeft();
    }
  }];
  $scope.goto = function(path) {
    $location.path(path);
    $scope.sideMenuController.toggleLeft();
  }
})
.controller('SettingsCtrl', function($scope, $location, Flash, Page) {
  Page.setTitle('Settings');
  $scope.localStorage = localStorage;
  $scope.updateSettings = function(settings) {
    localStorage.uberzeit_api_token = settings.api_key;
    Flash.setMessage('Saved!');
    $location.path( "/timer" );
  }
})
.controller('TimerCtrl', function($scope, $ionicLoading, $location, Flash, Page, Timer) {
  Page.setTitle('Timer');

  if(localStorage.uberzeit_api_token == undefined) {
    $location.path( "/settings" );
  }

  $scope.stopTimer = function() {
    console.log('stop');
    $scope.timer.stop(
      function(data) {
        Flash.setMessage('Timer stopped!');
      },
      function(reason) {
        Flash.setMessage('Timer stop failed: ' + reason);
      });
  }
  $scope.startTimer = function() {
    console.log('start');
    $scope.timer.start(
      function(data) {
        Flash.setMessage('Timer started!');
      },
      function(reason) {
        Flash.setMessage('Timer start failed (' + reason.status + ')');
      });
  }

  $scope.loading = $ionicLoading.show({
    content: 'Loading',
    animation: 'fade-in',
    showBackdrop: true,
    maxWidth: 200,
    showDelay: 500
  });

  timer_loaded = function(timer) {
    $scope.timer = timer;
    console.log(timer);
    $scope.loading.hide();
    $scope.$broadcast('scroll.refreshComplete');
  }

  $scope.onRefresh = function() {
    Flash.setMessage();
    $scope.timer = Timer.timer().then(timer_loaded);
  }

  $scope.onRefresh();

})
