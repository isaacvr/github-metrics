(function() {

  var myApp = angular.module('metricsGenerator', []);

  myApp.controller('issuesController', [
    '$scope',
    '$http',
    function($scope, $http) {

      $scope.init = function init() {

        $scope.DATE_FORMAT = 'DD/MM/YYYY';
        $scope.DAYS = moment.weekdays();
        $scope.DEBUG_MODE = true;
        $scope.ISSUES_PER_PAGE = 30;
        $scope.ISSUE_STATES = ['all', 'open', 'closed'];
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

        $scope.issuesError = false;
        $scope.userOrder = false;

        $scope.issueState = 'open';

        $scope.pagination = 1;

        $scope.issuesCant = $scope.ISSUES_PER_PAGE;
        $scope.issuesOffset = 0;

        $scope.references = {};
        $scope.timeScaleDay = {};
        $scope.timeScaleWeek = {};
        $scope.timeScaleMonth = {};

        if (Array.isArray($scope.users) === true) {
          $scope.users.length = 0;
        } else {
          $scope.users = [];
        }

        if (Array.isArray($scope.issues) === true) {
          $scope.issues.length = 0;
        } else {
          $scope.issues = [];
        }

        if (Array.isArray($scope.filteredIssues) === true) {
          $scope.filteredIssues.length = 0;
        } else {
          $scope.filteredIssues = [];
        }

        $scope.issueState = 'open';
        $scope.stats = {
          open: 0,
          closed: 0,
          all: 0,
          merged: 0
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

      $scope.setPage = function setPage(num) {
        $scope.pagination = num;
        $scope.updateIssuesFilter(true);
      };

      $scope.getPercent = function getPercent(part, total, cd) {

        cd = ~~(cd || 2);
        var pot = Math.pow(10, cd);
        var res = Math.round(part * 100 * pot / Math.max(1, total));

        return (res / pot) + '%';

      };

      $scope.updateIssuesFilter = function updateIssuesFilter(change) {

        change = !change;

        if ( change === true ) {
          $scope.setPage(1);
          return;
        }

        var tot = $scope.stats[$scope.issueState];
        var ppp = $scope.ISSUES_PER_PAGE;
        var cant = Math.floor((tot - 1) / ppp) + 1;

        $scope._tempPr = new Array(cant);

        $scope.issuesCant = ppp;
        var page = $scope.pagination;
        $scope.issuesOffset = (page - 1) * ppp;

        $scope.filteredIssues = $scope.issues.filter($scope.issuesFilter);

      };

      $scope.issuesFilter = function issuesFilter(iss, idx, arr) {

        if ($scope.issuesCant === 0) {
          return false;
        }

        if ($scope.issueState === 'all' || $scope.issueState === iss.state) {
          if ($scope.issuesOffset === 0) {
            $scope.issuesCant -= 1;
            return true;
          } else {
            $scope.issuesOffset -= 1;
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
          }

          parts.push(('00' + c.toString(16)).substr(-2, 2));

        }

        return '#' + parts.join('');

      };

      $scope.selectField = function selectField(field) {

        $scope.userField = field;
        $scope.userOrder = !$scope.userOrder;

      };

      $scope.getTimeDifference = function getTimeDifference(ma, mb) {

        if (ma.isValid() === false || mb.isValid() === false) {
          return '--';
        }

        $scope.stats.merged += 1;

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

      $scope.timeScaleAdd = function timeScaleAdd(iss) {

        var initialDay = moment(iss.created_at_moment);
        initialDay.subtract( initialDay.format('d'), 'days' );

        var day = iss.created_at_moment.format('DD-MM-YYYY');
        var week = initialDay.format('DD-MM-YYYY');
        var month = iss.created_at_moment.format('MM-YYYY');

        $scope.timeScaleDay[ day ] = $scope.timeScaleDay[ day ] || [];
        $scope.timeScaleDay[ day ].push(iss);

        $scope.timeScaleWeek[ week ] = $scope.timeScaleWeek[ week ] || [];
        $scope.timeScaleWeek[ week ].push(iss);

        $scope.timeScaleMonth[ month ] = $scope.timeScaleMonth[ month ] || [];
        $scope.timeScaleMonth[ month ].push(iss);

      };

      $scope.addIssue = function addIssue(username) {

        var len = $scope.users.length;

        for (var i = 0; i < len; i += 1) {
          if ( $scope.users[i].id === username ) {
            $scope.users[i].issues += 1;
            return;
          }
        }

        $scope.users.push({
          name: '@' + username,
          id: username,
          commits: 0,
          pulls: 0,
          issues: 1
        });

      };

      $scope.parseIssues = function parseIssues(data) {

        var i, len = data.length;

        var model = {
          created_at: moment,
          closed_at: moment
        };

        for (i = 0; i < len; i += 1) {

          $scope.addReferences(data[i].title);
          $scope.stats.all += 1;
          $scope.stats[data[i].state] += 1;

          for (var j in model) {
            if (model.hasOwnProperty(j) === true) {

              data[i][j + '_moment'] = model[j](data[i][j]);

              if (data[i][j]) {
                data[i][j] = data[i][j + '_moment'].format($scope.DATE_FORMAT);
              } else {
                data[i][j] = '--';
              }
            }
          }

          $scope.updateIssueSteps(data[i]);

          $scope.addIssue(data[i].user.login);
          $scope.timeScaleAdd(data[i]);

        }

        //DEBUG('USERS parseIssues: ', $scope.users);

        return data;

      };

      $scope.updateIssueSteps = function updateIssueSteps(issue) {

        /**
         * Take all the relevant steps of an issue and get the date
         * using Moment.JS. The format `date || null` is because
         * moment(undefined) returns a valid date, and that's not
         * what we want, but moment(null) do returns an invalid
         * date.
         */
        var created_at  = moment(issue.created_at_moment || null);
        var assigned_at = moment(issue.assigned_at_moment || null);
        var commited_at = moment(issue.commited_at_moment || null);
        var merged_at = moment(issue.merged_at_moment || null);
        var closed_at   = moment(issue.closed_at_moment || null);

        var names = [ 'assigned_at', 'commited_at', 'merged_at', 'closed_at' ];
        var dates = [ assigned_at, commited_at, merged_at, closed_at ];
        var i, j;

        //DEBUG('ISSUE #' + issue.number + ' STEPS: ', created_at, assigned_at, commited_at, closed_at);

        for (i = 0; i < names.length; i += 1) {
          if ( dates[i].isValid() === true ) {
            issue[ names[i] ] = $scope.getTimeDifference(created_at, dates[i]);
          } else {
            issue[ names[i] ] = '--';
          }
        }

      };

      $scope.findIssue = function findIssue(number) {

        var ini = 0, fin = $scope.issues.length - 1, mid;
        var temp;

        while ( ini <= fin ) {

          mid = (ini + fin) >> 1;
          temp = $scope.issues[mid];

          if ( temp.number === number ) {
            return temp;
          } else if ( temp.number > number ) {
            ini = mid + 1;
          } else {
            fin = mid - 1;
          }

        }

        return null;

      };

      $scope.setIssueProperty = function setIssueProperty(prop, event) {

        var issue = $scope.findIssue(event.issue.number);

        if ( issue === null ) {
          return;
        } else {
          issue[prop] = moment(event.created_at);
          $scope.updateIssueSteps(issue);
        }

      };

      $scope.addEvents = function addEvents(events) {

        var len = events.length, i;

        /*
                      referenced
                      assigned
                      closed
                      merged
        //*/

        for (i = 0; i < len; i += 1) {
          if ( events[i].event === 'referenced' ) {
            //DEBUG('Referenced event', events[i].actor.login);
            $scope.setIssueProperty('commited_at_moment', events[i]);
          } else if ( events[i].event === 'assigned' ) {
            //DEBUG('Assigned event', events[i].assignee.login);
            $scope.setIssueProperty('assigned_at_moment', events[i]);
          } else if ( events[i].event === 'merged' ) {
            //DEBUG('Merged event', events[i].actor.login);
            $scope.setIssueProperty('merged_at_moment', events[i]);
          }//*/
        }

      };

      $scope.getEvents = function getEvents(page) {

        page = page || '';
        var pageNumber = ~~page;

        if (pageNumber === 0) {
          pageNumber = 1;
        }

        var url = '/json/events' + page + '.json';

        $http
        .get(url)
        .success(function(data) {

          $scope.addEvents(data);

          pageNumber += 1;

          $scope.getEvents(pageNumber);

        })
        .catch(function(err) {

          DEBUG('EVENTS ERROR: ', err);

        });

      };

      $scope.getIssues = function getIssues(page) {

        page = page || '';
        var pageNumber = ~~page;

        if (pageNumber === 0) {
          pageNumber = 1;
          $scope.issues = [];
        }

        var url = '/json/issues' + page + '.json';

        $scope.issuesError = false;

        $http
        .get(url)
        .success(function(data) {

          $scope.issues = $scope.issues.concat($scope.parseIssues(data));

          var len = data.length;
          pageNumber += 1;

          $scope.getIssues(pageNumber);

        })
        .catch(function(err) {

          DEBUG('ISSUES ERROR: ', err);

          if (pageNumber === 1) {
            $scope.issuesError = true;
          } else {
            $scope.getEvents();
            $scope.setPage(1);
            DEBUG('STATS: ', $scope.stats);
            console.timeEnd('loadIssues');
          }

        });

      };

      $scope.getPullRequests = function getPullRequests(page) {

        page = page || '';
        var pageNumber = ~~page;

        if (pageNumber === 0) {
          pageNumber = 1;
          $scope.pullRequests = {};
        }

        var url = '/json/pr' + page + '.json';

        $scope.pullRequestError = false;

        $http
        .get(url)
        .success(function(data) {

          var len = data.length;

          for (var i = 0; i < len; i += 1) {
            $scope.pullRequests[ data[i].number ] = moment( data[i].created_at );
          }

          pageNumber += 1;

          $scope.getPullRequests(pageNumber);

        })
        .catch(function(err) {

          /**
           * Esto es para asegurarnos que se cargaron todos los
           * datos de los PR porque luego son usados para las
           * stats de los issues
           */
          $scope.getIssues();

        });

      };

      $scope.generateMetrics = function generateMetrics() {

        console.time('loadIssues');

        $scope.init();

        $scope.getPullRequests();

      };

    }
    ]);

}());