(function() {

  var ui = angular.module('ui', []);

  ui.directive('pagination', function() {

    return {
      restrict: "E",
      scope: {
        type: "@",
        pagination: "=",
        paginator: "="
      },
      replace: true,
      template: [
      '<ul class="pagination-container">',
        '<li class="pagination-number" ng-click="setPage(type, 1)" ng-bind="\'<<\'"></li>',
        '<li class="pagination-number" ng-click="setPage(type, pagination - 1)" ng-bind="\'<\'"></li>',
        '<li class="pagination-number" ng-class="{ selected: pos + 1 === pagination }" ng-repeat="(pos, value) in paginator track by $index" ng-click="setPage(type, pos+1)" ng-bind="pos+1" ng-show="pagination <= pos + 1 && pos <= pagination + 8"></li>',
        '<li class="pagination-number" ng-click="setPage(type, pagination + 1)" ng-bind="\'>\'"></li>',
        '<li class="pagination-number" ng-click="setPage(type, paginator.length)" ng-bind="\'>>\'"></li>',
      '</ul>'
      ].join(''),
      link: function(scope) {
        scope.setPage = scope.$parent.setPage;
      }
    };

  });

}());