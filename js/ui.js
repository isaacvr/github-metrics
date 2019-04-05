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

  ui.directive('issues', function() {

    return {
      restrict: "E",
      scope: {
        source: "="
      },
      replace: true,
      template: [
        '<table class="table table-bordered">',
        '<tr>',
          '<th><span class="fa fa-cog"></span></th>',
          '<th>#</th>',
          '<th><span class="fa fa-users"></span></th>',
          '<th><span class="fa fa-user-times"></span></th>',
          '<th>Committers</th>',
          '<th>Title</th>',
          '<th ng-class="{\'hidden\': !source.assignees}">Assignees</th>',
          '<th>Created</th>',
          '<th ng-class="{\'hidden\': !source.assigned_at}">Assigned</th>',
          '<th ng-class="{\'hidden\': !source.commited_at}">Commited</th>',
          '<th ng-class="{\'hidden\': !source.merged_at}">Merged</th>',
          '<th ng-class="{\'hidden\': !source.closed_at}">Closed</th>',
          '<th><span class="fa fa-tag"></span></th>',
          '<th><span class="fa fa-comment"></span></th>',
        '</tr>',
        '<tr ng-repeat="issue in source">',
          '<td><span class="fa {{issue.state}}" ng-class="{ \'fa-lock\': issue.state === \'closed\', \'fa-unlock\': issue.state === \'open\' }"></span></td>',
          '<td ng-bind="issue.number"></td>',
          '<td ng-bind="\'@\' + issue.user.login"></td>',
          '<td ng-bind="\'@\' + issue.closed_by"></td>',
          '<td ng-class="{\'hidden\': !source.assignees}">',
            '<span class="reviewer" ng-repeat="user in issue.committers" ng-bind="\'@\' + user"></span>',
          '</td>',
          '<td ng-bind="issue.title"></td>',
          '<td ng-class="{\'hidden\': !source.assignees}">',
            '<span class="reviewer" ng-repeat="user in issue.assignees" ng-bind="user.login"></span>',
          '</td>',
          '<td ng-bind="issue.created_at"></td>',
          '<td ng-class="{\'hidden\': !source.assigned_at}" ng-bind="issue.assigned_at"></td>',
          '<td ng-class="{\'hidden\': !source.commited_at}" ng-bind="issue.commited_at"></td>',
          '<td ng-class="{\'hidden\': !source.merged_at}" ng-bind="issue.merged_at"></td>',
          '<td ng-class="{\'hidden\': !source.closed_at}" ng-bind="issue.closed_at"></td>',
          '<td>',
            '<span class="label" ng-repeat="label in issue.labels" ng-bind="label.name" ng-style="{ \'background-color\': \'#\' + label.color, \'color\': inverseColor(label.color) }"></span>',
          '</td>',
          '<td ng-bind="issue.comments"></td>',
        '</tr>',
      '</table>'
      ].join(''),
      link: function(scope) {
        scope.inverseColor = scope.$parent.inverseColor;
      }
    };

  });

  ui.directive('pulls', function() {

    return {
      restrict: "E",
      scope: {
        source: "="
      },
      replace: true,
      template: [
        '<table class="table table-bordered">',
          '<tr>',
            '<th><span class="fa fa-cog"></span></th>',
            '<th><span class="fa fa-users"></span></th>',
            '<th>Title</th>',
            '<th ng-class="{\'hidden\': !source.timeToMerge}">Created to Merged</th>',
            '<th ng-class="{\'hidden\': !source.reviews}">Reviews</th>',
            '<th ng-class="{\'hidden\': !source.requested_reviewers}">Reviewers</th>',
            '<th ng-class="{\'hidden\': !source.labels}"><span class="fa fa-tag"></span></th>',
          '</tr>',
          '<tr ng-repeat="pr in source">',
            '<td><span class="fa {{pr.state}}" ng-class="{ \'fa-lock\': pr.state === \'closed\', \'fa-unlock\': pr.state === \'open\' }"></span></td>',
            '<td ng-bind="\'@\' + pr.user.login"></td>',
            '<td ng-bind="pr.title"></td>',
            '<td ng-class="{\'hidden\': !source.timeToMerge}" ng-bind="pr.timeToMerge"></td>',
            '<td ng-class="{\'hidden\': !source.reviews}" ng-bind="pr.reviews.length"></td>',
            '<td ng-class="{\'hidden\': !source.requested_reviewers}">',
              '<span class="reviewer" ng-repeat="reviewer in pr.requested_reviewers" ng-bind="reviewer.login"></span>',
            '</td>',
            '<td ng-class="{\'hidden\': !source.labels}">',
              '<span class="label" ng-repeat="label in pr.labels" ng-bind="label.name" ng-style="{ \'background-color\': \'#\' + label.color, \'color\': inverseColor(label.color) }"></span>',
            '</td>',
          '</tr>',
        '</table>'
      ].join(''),
      link: function(scope) {
        scope.inverseColor = scope.$parent.inverseColor;
      }
    };

  });

}());