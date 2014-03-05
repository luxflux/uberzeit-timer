angular.module('uberzeit-timer', ['ionic', 'ngResource', 'angularMoment'])

.config(function($stateProvider, $urlRouterProvider, amTimeAgoConfig) {

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

    amTimeAgoConfig.withoutSuffix = true;
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

  var timer_entity = function(response) {
    timer = {
      start: function() {
        deferred = $q.defer();
        console.log('start called');
        UberZeitTimer.start(null,
                            function(response) {
                              deferred.resolve(timer_entity(response));
                            },
                            function(reason) {
                              deferred.reject(reason);
                            });
        return deferred.promise;
      },
      stop: function() {
        deferred = $q.defer();
        console.log('stop called');
        UberZeitTimer.stop(null,
                            function(response) {
                              console.log(response);
                              deferred.resolve(timer_entity(response));
                            },
                            function(reason) {
                              deferred.reject(reason);
                            });
        return deferred.promise;
      }
    }
    if(response.start != null && response.end == null) {
      timer.running = true;
      timer.duration = response.duration;
      timer.started_at = moment(response.date + ' ' + response.start, 'YYYY-MM-DD HH:mm');
    } else {
      timer.running = false;
      timer.duration = null;
      timer.started_at = null;
    }
    return timer;
  }

  return {
    timer: function() {
      deferred = $q.defer();
      UberZeitTimer.get(null,
                        function(response) {
                          deferred.resolve(timer_entity(response));
                        },
                        function(reason) {
                            console.log(reason);
                          if(reason.status == 404) {
                            deferred.resolve(timer_entity({}));
                          } else {
                            deferred.reject(reason);
                          }
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

    $scope.loading = $ionicLoading.show({
      content: 'Stopping timer',
      animation: 'fade-in',
      showBackdrop: true,
      maxWidth: 200,
      showDelay: 500
    });

    $scope.timer.stop().then(
      function(data) {
        $scope.timer = data;
        Flash.setMessage('Timer stopped!');
        $scope.loading.hide();
      },
      function(reason) {
        Flash.setMessage('Timer stop failed: ' + reason);
        $scope.loading.hide();
      });
  }

  $scope.startTimer = function() {

    $scope.loading = $ionicLoading.show({
      content: 'Starting timer',
      animation: 'fade-in',
      showBackdrop: true,
      maxWidth: 200,
      showDelay: 500
    });

    $scope.timer.start().then(
      function(data) {
        $scope.timer = data;
        Flash.setMessage('Timer started!');
        $scope.loading.hide();
      },
      function(reason) {
        Flash.setMessage('Timer start failed (' + reason.status + ')');
        $scope.loading.hide();
      });
  }



  $scope.refresh = function() {
    Flash.setMessage();

    $scope.loading = $ionicLoading.show({
      content: 'Loading',
      animation: 'fade-in',
      showBackdrop: true,
      maxWidth: 200,
      showDelay: 500
    });

    Timer.timer().then(
      function(timer) {
        $scope.timer = timer;
        console.log(timer);
        $scope.loading.hide();
        $scope.$broadcast('scroll.refreshComplete');
      },
      function(reason) {
        console.log(reason);
        console.log('failed');
      });

  }

  $scope.refresh();

})
