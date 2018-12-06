(function() {

  var myApp = angular.module('metricsGenerator', ['ui']);

  myApp.controller('pullsController', [
    '$scope',
    '$http',
    function($scope, $http) {

      $scope.init = function init() {

        $scope.DATE_FORMAT = 'DD/MM/YYYY';
        $scope.DAYS = moment.weekdays();
        $scope.DEBUG_MODE = false;
        $scope.PULLS_PER_PAGE = 30;
        $scope.PR_STATES = ['all', 'open', 'closed'];
        $scope.TABS = [
          {
            range: 'all',
            content: 'All'
          },
          {
            range: 'diario',
            content: 'Daily'
          },
          {
            range: 'semanal',
            content: 'Weekly'
          },
          {
            range: 'mensual',
            content: 'Monthly'
          }
        ];

        $scope.pullRequestError = false;
        $scope.userOrder = false;

        $scope.pullState = 'open';

        $scope.pagination = {
          pr: 1
        };

        $scope.pullRequestCant = $scope.PULLS_PER_PAGE;
        $scope.pullRequestOffset = 0;

        $scope.references = {};
        $scope.timeScaleDay = {};
        $scope.timeScaleWeek = {};
        $scope.timeScaleMonth = {};

        if (Array.isArray($scope.users) === true) {
          $scope.users.length = 0;
        } else {
          $scope.users = [];
        }

        if (Array.isArray($scope.pullRequests) === true) {
          $scope.pullRequests.length = 0;
        } else {
          $scope.pullRequests = [];
        }

        if (Array.isArray($scope.filteredPullRequests) === true) {
          $scope.filteredPullRequests.length = 0;
        } else {
          $scope.filteredPullRequests = [];
        }

        $scope.pullState = 'open';
        $scope.stats = {
          pr: {
            open: 0,
            closed: 0,
            all: 0,
            merged: 0
          }
        };

        $scope.timeRange = 'all';

        $scope._tempPr = [];

      };

      $scope.init();

      var DEBUG = function DEBUG() {

        if ($scope.DEBUG_MODE === true) {
          console.log.apply(null, arguments);
        }

      };

      $scope.selectTimeRange = function selectTimeRange(tr) {
        $scope.timeRange = tr;
      };

      $scope.scrollTop = function scrollTop() {

        var ini = window.scrollY;
        var i = 0;

        var itv = setInterval(function() {

          window.scroll(0, ini - ini * Math.sqrt(i));

          if (i >= 1) {
            clearInterval(itv);
          }

          i += 0.01;

        }, 5);

      };

      $scope.setPage = function setPage(name, num) {

        var tot = $scope.stats.pr[$scope.pullState];
        var ppp = $scope.PULLS_PER_PAGE;
        var cant = Math.floor((tot - 1) / ppp) + 1;

        if ( num < 1 || num > cant ) {
          return;
        }

        $scope.pagination[name] = num;
        $scope.updatePullRequestFilter(true);
      };

      $scope.getPercent = function getPercent(part, total, cd) {

        cd = ~~(cd || 2);
        var pot = Math.pow(10, cd);
        var res = Math.round(part * 100 * pot / total);

        return (res / pot) + '%';

      };

      $scope.updatePullRequestFilter = function updatePullRequestFilter(change) {

        change = !change;

        if ( change === true ) {
          $scope.setPage('pr', 1);
          return;
        }

        var tot = $scope.stats.pr[$scope.pullState];
        var ppp = $scope.PULLS_PER_PAGE;
        var cant = Math.floor((tot - 1) / ppp) + 1;

        $scope._tempPr = new Array(cant);

        $scope.pullRequestCant = ppp;
        var page = $scope.pagination.pr;
        $scope.pullRequestOffset = (page - 1) * ppp;

        $scope.filteredPullRequests = $scope.pullRequests.filter($scope.pullRequestFilter);

        $scope.setColumnVisibility($scope.filteredPullRequests);

      };

      $scope.pullRequestFilter = function pullRequestFilter(pr, idx, arr) {

        if ($scope.pullRequestCant === 0) {
          return false;
        }

        if ($scope.pullState === 'all' || $scope.pullState === pr.state) {
          if ($scope.pullRequestOffset === 0) {
            $scope.pullRequestCant -= 1;
            return true;
          } else {
            $scope.pullRequestOffset -= 1;
            return false;
          }
        } else {
          return false;
        }

      };

      $scope.isReference = function isReference(str) {

        if (str.length > 0) {
          if (str[0] === '#') {
            for (var i = 1, j = str.length; i < j; i += 1) {
              if (("0123456789").indexOf(str[i]) === -1) {
                return false;
              }
            }
            return true;
          }
        }

        return false;

      };

      $scope.addReferences = function addReferences(msg) {

        var str = msg.replace(/\r/g, '').replace(/\n/g, ' ');
        var len;

        str = str.split(' ');

        len = str.length;

        for (var i = 0; i < len; i += 1) {
          if ($scope.isReference(str[i]) === true) {
            str[i] = parseInt(str[i].substr(1, str[i].length - 1));
            if ($scope.references.hasOwnProperty(str[i]) === true) {
              $scope.references[str[i]] += 1;
            } else {
              $scope.references[str[i]] = 1;
            }
          }
        }

      };

      $scope.inverseColor = function inverseColor(color) {

        var parts = [];
        var c, mid = 255 >> 1;

        for (var i = 0; i <= 4; i += 2) {

          c = parseInt(color.substr(i, 2), 16);

          if (c >= mid) {
            c = 0;
          } else {
            c = 255;
          }//*/

          parts.push(('00' + c.toString(16)).substr(-2, 2));

        }

        return '#' + parts.join('');

      };

      $scope.selectField = function selectField(field) {

        $scope.userField = field;
        $scope.userOrder = !$scope.userOrder;

      };

      $scope.addPullRequest = function addPullRequest(username) {

        var len = $scope.users.length;

        for (var i = 0; i < len; i += 1) {
          if ($scope.users[i].id === username) {
            $scope.users[i].pulls += 1;
            return;
          }
        }

        $scope.users.push({
          name: '@' + username,
          id: username,
          commits: 0,
          pulls: 1,
          issues: 0
        });

      };

      $scope.getTimeToMerge = function getTimeToMerge(ma, mb) {

        if (ma.isValid() === false || mb.isValid() === false) {
          return '--';
        }

        $scope.stats.pr.merged += 1;

        var times = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
        var offset = 0;
        var val = 0;

        for (var i = 0, max = times.length; i < max && val == 0; i += 1) {

          val = mb.diff(ma, times[i]);
          offset = i;

        }

        //DEBUG('Diff: ', val, times[offset]);

        var resp = times[offset];

        if (val === 1) {
          resp = resp.substr(0, resp.length - 1);
        }

        return val + ' ' + resp;

      };

      $scope.formatWeek = function formatWeek(week) {
        var ini = moment(week, 'DD-MM-YYYY');
        var fin = moment(ini);
        var fmt = $scope.DATE_FORMAT;

        fin.add(6, 'days');

        return ini.format(fmt) + ' >> ' + fin.format(fmt);

      };

      $scope.formatMonth = function formatMonth(month) {

        var mnt = moment(month, 'MM-YYYY');
        return mnt.format('MMMM, YYYY');

      };

      $scope.formatDay = function formatDay(day) {
        return day.replace(/-/g, '/');
      };

      $scope.timeScaleAdd = function timeScaleAdd(pr) {

        var initialDay = moment(pr.created_at, 'DD/MM/YYYY');
        var created_at_moment = moment(initialDay);
        initialDay.subtract( initialDay.format('d'), 'days' );

        var day = created_at_moment.format('DD-MM-YYYY');
        var week = initialDay.format('DD-MM-YYYY');
        var month = created_at_moment.format('MM-YYYY');

        $scope.timeScaleDay[ day ] = $scope.timeScaleDay[ day ] || [];
        $scope.timeScaleDay[ day ].push(pr);

        $scope.timeScaleWeek[ week ] = $scope.timeScaleWeek[ week ] || [];
        $scope.timeScaleWeek[ week ].push(pr);

        $scope.timeScaleMonth[ month ] = $scope.timeScaleMonth[ month ] || [];
        $scope.timeScaleMonth[ month ].push(pr);

      };

      $scope.setColumnVisibility = function setColumnVisibility(obj) {

        var props = [ 'created_at', 'closed_at', 'merged_at', 'timeToMerge' ];
        var arrProps = [ 'requested_reviewers', 'reviews', 'labels' ];

        var emptyValues = {
          created_at: "--",
          closed_at: "--",
          merged_at: "--",
          timeToMerge: "--"
        };//*/

        var visibility = {
          created_at: false,
          closed_at: false,
          merged_at: false,
          timeToMerge: false
        };//*/

        for (var k = 0; k < props.length; k += 1) {
          obj[ arrProps[k] ] = false;
        }

        for (var j = 0; j < obj.length; j += 1) {
          for (var k = 0; k < props.length; k += 1) {
            if ( obj[j].hasOwnProperty(props[k]) === true ) {
              if ( obj[j][ props[k] ] != emptyValues[ props[k] ] ) {
                visibility[ props[k] ] = true;
                //console.log('Hay uno no vacio: ', props[k], obj[j][ props[k] ]);
              }
            }
          }
          for (var k = 0; k < arrProps.length; k += 1) {
            if (obj[j].hasOwnProperty(arrProps[k]) === true) {
              obj[ arrProps[k] ] = obj[ arrProps[k] ] || (obj[j][ arrProps[k] ].length > 0);
            }
          }
        }
        for (var j = 0; j < props.length; j += 1) {
          obj[ props[j] ] = visibility[ props[j] ];
        }
      };

      $scope.parsePullRequests = function parsePullRequests(data) {

        var i, len = data.length;

        for (i = 0; i < len; i += 1) {
          $scope.timeScaleAdd(data[i]);
        }

      };

      $scope.getReviews = function getReviews(pr) {

        $http
        .get('/json/review-' + pr.number + '.json')
        .success(function(rv) {
          pr.reviews = rv;
        })
        .catch(function(err) {
          DEBUG('ERROR Trying to fecth review #' + pr.number);
        });

      };

      $scope.getPullRequests = function getPullRequests(page) {

        /*page = page || '';
        var pageNumber = ~~page;

        if (pageNumber === 0) {
          pageNumber = 1;
          $scope.pullRequests = [];
        }//*/

        //var url = '/json/pr' + page + '.json';
        var url = '/json/pulls_stats.json';

        $scope.pullRequestError = false;

        $http
        .get(url)
        .success(function(data) {

          //$scope.pullRequests = $scope.pullRequests.concat($scope.parsePullRequests(data));
          $scope.pullRequests = data.pulls;
          $scope.users = data.users;
          $scope.stats = data.stats;

          $scope.parsePullRequests($scope.pullRequests);

          for (var i in $scope.timeScaleDay) {
            if ( $scope.timeScaleDay.hasOwnProperty(i) === true ) {
              $scope.setColumnVisibility($scope.timeScaleDay[i]);
            }
          }

          for (var i in $scope.timeScaleWeek) {
            if ( $scope.timeScaleWeek.hasOwnProperty(i) === true ) {
              $scope.setColumnVisibility($scope.timeScaleWeek[i]);
            }
          }

          for (var i in $scope.timeScaleMonth) {
            if ( $scope.timeScaleMonth.hasOwnProperty(i) === true ) {
              $scope.setColumnVisibility($scope.timeScaleMonth[i]);
            }
          }

          $scope.setPage('pr', 1);

        })
        .catch(function(err) {
          DEBUG('PR ERROR: ', err);
        });

      };

      $scope.generateMetrics = function generateMetrics() {

        $scope.init();

        setTimeout($scope.getPullRequests, 0);

      };

    }
    ]);

}());