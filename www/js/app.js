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
        UberZeitTimer.stop(null,
                            function(response) {
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
    timer.stopped = !timer.running;
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
                          // if there is no timer, uberZeit returns {"status": 404}
                          // if there was another error like no internet connection, there will be no data
                          if(reason.status == 404 && (reason.data != null && reason.data.status == 404)) {
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

    $scope.timer.stop().then(
      function(data) {
        $scope.timer = data;
      },
      function(reason) {
        Flash.setMessage('Timer stop failed: ' + reason);
      });
  }

  $scope.startTimer = function() {
    $scope.timer.start().then(
      function(data) {
        $scope.timer = data;
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

  $scope.refresh = function() {
    Flash.setMessage();

    Timer.timer().then(
      function(timer) {
        $scope.timer = timer;
        $scope.loading.hide();
        $scope.$broadcast('scroll.refreshComplete');
      },
      function(reason) {
        Flash.setMessage('Timer could not be loaded, no internet connection?');
        $scope.timer = {};
        $scope.loading.hide();
        $scope.$broadcast('scroll.refreshComplete');
      });

  }

  $scope.refresh();

})
