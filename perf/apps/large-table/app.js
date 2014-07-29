var app = angular.module('plunker', ['ngRoute']);

app.config(function($routeProvider) {
  $routeProvider.
    when('/baseline-interpolation', { templateUrl: 'baseline-interpolation.html' }).
    when('/baseline-binding', { url: '/baseline-binding', templateUrl: 'baseline-binding.html' }).
    when('/one-time-interpolation', { templateUrl: 'one-time-interpolation.html' }).
    when('/one-time-binding', { templateUrl: 'one-time-binding.html' }).
    when('/clear', {url: '/clear', template: 'nothing here :-)'}).
    otherwise({redirectTo: '/clear'})
});

app.controller('MainCtrl', function($scope, $timeout, $window) {
  var totalRows = 100;
  var totalColumns = 20;
  var routeChangeStart;
  var p = window.performance || window.Date;

  var data = $scope.data = [];
  $scope.digestDuration = '?';
  $scope.numberOfBindings = totalRows*totalColumns*2 + totalRows + 1;
  $scope.numberOfWatches = '?';

  $scope.$on('$routeChangeStart', function() {
    $scope.loading = true;
    routeChangeStart = p.now();
  });

  $scope.$on('$routeChangeSuccess', function() {
    $scope.loading = false;
    $scope.numberOfWatches = '?';
    $scope.digestDuration = '?';
    $scope.$$postDigest(function() {
      $scope.routeChangeDuration = (p.now() - routeChangeStart).toFixed(3);
      $scope.$apply();
    });


  });

  for (var i=0; i<totalRows; i++) {
    data[i] = [];
    for (var j=0; j<totalColumns; j++) {
      data[i][j] = {i: i, j: j};
    }
  }

  $scope.timeDigest = function() {
    var now = Date.now();
    $scope.$$postDigest(function() {
      $timeout(function() {
        $scope.numberOfWatches = $scope.$$watchers.length +
                                 $scope.$$childHead.$$watchers.length +
                                (totalRows * $scope.$$childHead.$$childHead.$$watchers.length) +
                                (totalColumns * totalRows * $scope.$$childHead.$$childHead.$$childHead.$$watchers.length);
        $scope.digestDuration = (Date.now() - now);
      });
    });
  }
});
