(function() {

  var myApp = angular.module('metricsGenerator', ['ui']);

  myApp.controller('metricsController', [
    '$scope',
    '$http',
    function($scope, $http) {

      Chart.defaults.global.defaultFontSize = 18;

      var Table = require('olap-cube').model.Table;

      $scope.DATE_FORMAT = 'DD/MM/YYYY';
      $scope.DAYS = moment.weekdays();
      $scope.MONTHS = moment.months();
      $scope.DEBUG_MODE = true;
      $scope.PULLS_PER_PAGE = 30;
      $scope.ISSUES_PER_PAGE = 30;
      $scope.COMMITS_PER_PAGE = 30;
      $scope.PR_STATES = [ 'all', 'open', 'closed' ];
      $scope.IS_STATES = [ 'all', 'open', 'closed' ];
      $scope.selectedMonth = moment('2000-01-00T00:00:00Z').format('MMMM');

      $scope.selectedTab = 0;
      $scope.totalTabs = 2;

      $scope.summary = {
        olap1: false,
        olap2: false,
        filterByName: false,
        filterByRange: false,
        filterByState: false,
        dimension: 'authorName',
        showGraphics: [ true, true, true ]
      };

      $scope.doc = document;

      $scope.canvas = {
        olap1: $scope.doc.getElementById('olap1').getContext('2d'),
        olap2: $scope.doc.getElementById('olap2').getContext('2d')
        //commitsPerHour: $scope.doc.getElementById('commitsPerHour').getContext('2d'),
        //contribsPerWeek: $scope.doc.getElementById('contribsPerWeek').getContext('2d'),
        //commitsPerMonth: $scope.doc.getElementById('contribsPerMonth').getContext('2d'),
      };

      $scope.charts = {};

      $scope.createOrEmpty = function createOrEmpty(id) {

        if ( Array.isArray( $scope[id] ) === true ) {
          $scope[id].length = 0;
        } else {
          $scope[id] = [];
        }

      };

      $scope.init = function init() {

        $scope.issuesError = false;
        $scope.pullRequestError = false;
        $scope.commitsError = false;
        $scope.userOrder = false;

        $scope.pullState = 'open';
        $scope.issueState = 'open';
        $scope.selectedDay = 0;

        $scope.pagination = {
          pr: 1,
          is: 1,
          cm: 1
        };

        $scope.pullRequestCant = $scope.PULLS_PER_PAGE;
        $scope.pullRequestOffset = 0;

        $scope.issueCant = $scope.ISSUES_PER_PAGE;
        $scope.issueOffset = 0;

        $scope.commitCant = $scope.COMMITS_PER_PAGE;
        $scope.commitOffset = 0;

        $scope.references = {};
        $scope.contribs = {};
        $scope.selectedWeek = {};
        $scope.commitsPerMonth = {};
        $scope.commitsTable = {};
        $scope.issuesTable = {};
        $scope.pullRequestsTable = {};

        $scope.createOrEmpty('users');
        $scope.createOrEmpty('commits');
        $scope.createOrEmpty('issues');
        $scope.createOrEmpty('pullRequests');
        $scope.createOrEmpty('filteredPullRequests');
        $scope.createOrEmpty('filteredCommits');
        $scope.createOrEmpty('filteredIssues');
        $scope.createOrEmpty('contribKeys');
        $scope.createOrEmpty('punchCard');
        $scope.createOrEmpty('_tempPr');
        $scope.createOrEmpty('_tempCm');
        $scope.createOrEmpty('_tempIs');

        $scope.stats = {
          pr: {
            open: 0,
            closed: 0,
            merged: 0,
            all: 0
          },
          is: {
            open: 0,
            closed: 0,
            all: 0
          },
          cm: 0
        };

      };

      $scope.init();

      /// UTILS
      var DEBUG = function DEBUG() {

        if ( $scope.DEBUG_MODE === true ) {
          console.log.apply(null, arguments);
        }

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

        var tot, ppp, cant;

        if ( name === 'pr' ) {
          tot = $scope.stats.pr[ $scope.pullState ];
          ppp = $scope.PULLS_PER_PAGE;
          cant = Math.floor( ( tot - 1 ) / ppp ) + 1;

          if ( num < 1 || num > cant ) {
            return;
          }

          $scope.pagination[name] = num;
          $scope.updatePullRequestFilter(true);

        } else if ( name === 'is' ) {
          tot = $scope.stats.is[ $scope.issueState ];
          ppp = $scope.ISSUES_PER_PAGE;
          cant = Math.floor( ( tot - 1 ) / ppp ) + 1;

          if ( num < 1 || num > cant ) {
            return;
          }

          $scope.pagination[name] = num;
          $scope.updateIssueFilter(true);

        } else if ( name === 'cm' ) {
          tot = $scope.stats.cm;
          ppp = $scope.COMMITS_PER_PAGE;
          cant = Math.floor( ( tot - 1 ) / ppp ) + 1;

          if ( num < 1 || num > cant ) {
            return;
          }

          $scope.pagination[name] = num;
          $scope.updateCommitFilter(true);

        }

      };

      $scope.mergeSort = function mergeSort(arr, fn) {

        var len = arr.length;

        if ( len < 2 ) {
          return;
        }

        var merge = function merge(__arr, ini, mid, fin) {

          var a = ini, b = mid + 1;
          var res = [];

          while (a <= mid || b <= fin) {
            if (a <= mid && b <= fin) {
              if ( fn(__arr[a], __arr[b]) === true ) {
                res.push(__arr[a++]);
              } else {
                res.push(__arr[b++]);
              }
            } else if (a <= mid) {
              res.push(__arr[a++]);
            } else if (b <= fin) {
              res.push(__arr[b++]);
            }
          }

          for (var i = 0, j = ini; j <= fin; i += 1, j += 1) {
            __arr[j] = res[i];
          }

        };

        var ms = function ms(__arr, ini, fin) {

          if (ini >= fin) {
            return;
          }

          var mid = (ini + fin) >> 1;

          ms(__arr, ini, mid);
          ms(__arr, mid + 1, fin);
          merge(__arr, ini, mid, fin);

        };

        ms(arr, 0, len - 1);

      };

      /// FILTER UPDATERS
      $scope.updateCommitFilter = function updateCommitFilter(change) {

        change = !change;

        if ( change === true ) {
          $scope.setPage('cm', 1);
          return;
        }

        var tot = $scope.stats.cm;
        var ppp = $scope.COMMITS_PER_PAGE;
        var cant = Math.floor( ( tot - 1 ) / ppp ) + 1;

        $scope._tempCm = new Array( cant );

        $scope.commitCant = ppp;
        var page = $scope.pagination.cm;
        $scope.commitOffset = ( page - 1 ) * ppp;

        $scope.filteredCommits = $scope.commits.filter($scope.commitFilter);

      };

      $scope.updateIssueFilter = function updateIssueFilter(change) {

        change = !change;

        if ( change === true ) {
          $scope.setPage('is', 1);
          return;
        }

        var tot = $scope.stats.is[ $scope.issueState ];
        var ppp = $scope.ISSUES_PER_PAGE;
        var cant = Math.floor( ( tot - 1 ) / ppp ) + 1;

        $scope._tempIs = new Array( cant );

        $scope.issueCant = ppp;
        var page = $scope.pagination.is;
        $scope.issueOffset = ( page - 1 ) * ppp;

        $scope.filteredIssues = $scope.issues.filter($scope.issueFilter);

      };

      $scope.updatePullRequestFilter = function updatePullRequestFilter(change) {

        change = !change;

        if ( change === true ) {
          $scope.setPage('pr', 1);
          return;
        }

        var tot = $scope.stats.pr[ $scope.pullState ];
        var ppp = $scope.PULLS_PER_PAGE;
        var cant = Math.floor( ( tot - 1 ) / ppp ) + 1;

        $scope._tempPr = new Array( cant );

        $scope.pullRequestCant = ppp;
        var page = $scope.pagination.pr;
        $scope.pullRequestOffset = ( page - 1) * ppp;

        $scope.filteredPullRequests = $scope.pullRequests.filter($scope.pullRequestFilter);

      };

      /// FILTERS
      $scope.commitFilter = function commitFilter(cm, idx, arr) {

        if ( $scope.commitCant === 0 ) {
          return false;
        }

        if ( $scope.commitOffset === 0 ) {
          $scope.commitCant -= 1;
          return true;
        } else {
          $scope.commitOffset -= 1;
          return false;
        }

      };

      $scope.issueFilter = function issueFilter(is, idx, arr) {

        if ( $scope.issueCant === 0 ) {
          return false;
        }

        if ( $scope.issueState === 'all' || $scope.issueState === is.state ) {
          if ( $scope.issueOffset === 0 ) {
            $scope.issueCant -= 1;
            return true;
          } else {
            $scope.issueOffset -= 1;
            return false;
          }
        } else {
          return false;
        }

      };

      $scope.pullRequestFilter = function pullRequestFilter(pr, idx, arr) {

        if ( $scope.pullRequestCant === 0 ) {
          return false;
        }

        if ( $scope.pullState === 'all' || $scope.pullState === pr.state ) {
          if ( $scope.pullRequestOffset === 0 ) {
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

      $scope.selectTab = function selectTab(tb) {

        tb = ~~tb;

        if ( tb >= 0 && tb < $scope.totalTabs ) {
          $scope.selectedTab = tb;
          return;
        }

        $scope.selectedTab = 0;

      };

      $scope.inverseColor = function inverseColor(color) {

        var parts = [];
        var c, mid = 255 >> 1;

        for (var i = 0; i <= 4; i += 2) {

          c = parseInt(color.substr(i, 2), 16);

          if ( c >= mid ) {
            c = 0;
          } else {
            c = 255;
          }

          parts.push( ('00' + c.toString(16)).substr(-2, 2) );

        }

        return '#' + parts.join('');

      };

      $scope.selectField = function selectField(field) {

        $scope.userField = field;
        $scope.userOrder = !$scope.userOrder;

      };

      $scope.getContribDate = function getContribDate(dt) {

        return moment.unix(dt).format('MMMM D, YYYY');

      };

      /// Cube creators
      $scope.createCommitCube = function createCommitCube(commits) {

        var i, len = commits.length;
        var points = [];
        var data = [];

        for (i = 0; i < len; i += 1) {

          var obj = {
            sha: commits[i].sha,
            authorName: commits[i].commit.author.name,
            authorId: commits[i].commit.author.email,
            date: commits[i].commit.author.date,
            message: commits[i].commit.message,
            tree: commits[i].commit.tree.sha,
            comment_count: commits[i].commit.comment_count,
            //parents:       commits[i].parents,
          };

          if (commits[i].author != null) {
            obj.authorName = commits[i].author.login;
            obj.authorId = commits[i].author.id;
          }

          points.push([
            obj.authorName,
            obj.authorId,
            moment(obj.date).format('dddd'),
            moment(obj.date).format('MMMM'),
            moment(obj.date).format('YYYY'),
            moment(obj.date).format('HH'),
            moment(obj.date).format('mm'),
            obj.date
          ]);

          data.push([
            obj.sha,
            obj.message,
            obj.tree,
            obj.comment_count
          ]);
        }

        $scope.commitsTable = new Table({
          dimensions: [ 'authorName', 'authorId', 'day', 'month', 'year', 'hour', 'minute', 'date' ],
          points: points,
          fields: ['sha', 'message', 'tree', 'comment_count'],
          data: data
        });

      };

      $scope.createPullCube = function createPullCube(pulls) {

        var i, len = pulls.length;
        var points = [];
        var data = [];

        /*{
          //"title": "Fixes #1222 Document TODO items at API docs",
          //"created_at": "11/04/2018",
          //"closed_at": "12/04/2018",
          //"merged_at": "12/04/2018",
          "state": "closed",
          "user": {
            "login": "stdevEdu",
            "id": 35319998
          },
          "labels": [{"color":"f9d0c4","name":"tests"}],
          //"requested_reviewers": [{"login":"gz-c"}],
          "created_at_first": "2018-04-12T00:43:39Z",
        };//*/

        for (i = 0; i < len; i += 1) {

          var obj = {
            state: pulls[i].state,
            authorName: pulls[i].user.login,
            authorId: pulls[i].user.id,
            date: pulls[i].created_at_first,
            labels: pulls[i].labels
          };

          points.push([
            obj.authorName,
            obj.state,
            moment(obj.date).format('dddd'),
            moment(obj.date).format('MMMM'),
            moment(obj.date).format('YYYY'),
            moment(obj.date).format('HH'),
            moment(obj.date).format('mm'),
            obj.date
          ]);

          data.push([
            obj.labels
          ]);
        }

        $scope.pullsTable = new Table({
          dimensions: [ 'authorName', 'state', 'day', 'month', 'year', 'hour', 'minute', 'date' ],
          points: points,
          fields: ['labels'],
          data: data
        });

      };

      $scope.createIssueCube = function createIssueCube(issues) {
        var i, len = issues.length;
        var points = [];
        var data = [];

        /*
        {
          "title":"Translate the wallet",
          "created_at":"25/10/2018",
          "created_at_first":"25:10:2018T00:00:00Z",
          "closed_at":"--",
          "user":{"login":"Senyoret1","id":34079003},
          "labels":[],
          "assignees":[],
          "state":"open",
          "number":1981,
          "closed_by": "gz-c"
          "comments":0,
          "assigned_at":"--",
          "commited_at":"--",
          "merged_at":"--"
        };//*/

        for (i = 0; i < len; i += 1) {

          var obj = {
            state: issues[i].state,
            authorName: issues[i].user.login,
            authorId: issues[i].user.id,
            date: issues[i].created_at_first,
            labels: issues[i].labels
          };

          if ( issues[i].assignees.length === 0 ) {
            points.push([
              obj.authorName,
              obj.state,
              moment(obj.date).format('dddd'),
              moment(obj.date).format('MMMM'),
              moment(obj.date).format('YYYY'),
              moment(obj.date).format('HH'),
              moment(obj.date).format('mm'),
              obj.date,
              '',
              issues[i].closed_by || ''
            ]);

            data.push([
              obj.labels
            ]);
          }

          for (var j = 0; j < issues[i].assignees.length; j += 1) {
            points.push([
              obj.authorName,
              obj.state,
              moment(obj.date).format('dddd'),
              moment(obj.date).format('MMMM'),
              moment(obj.date).format('YYYY'),
              moment(obj.date).format('HH'),
              moment(obj.date).format('mm'),
              obj.date,
              issues[i].assignees[j].login,
              issues[i].closed_by || ''
            ]);

            data.push([
              obj.labels
            ]);
          }
        }

        $scope.issuesTable = new Table({
          dimensions: [ 'authorName', 'state', 'day', 'month', 'year', 'hour', 'minute', 'date', 'assignee', 'closer' ],
          points: points,
          fields: ['labels'],
          data: data
        });

      };

      $scope.getSummary = function getSummary() {

        var tables = [
          $scope.commitsTable,
          $scope.pullsTable,
          $scope.issuesTable
        ];

        var summary = $scope.summary;
        var user = [];

        for (var i = 0; i < tables.length; i += 1) {
          if ( !(tables[i] instanceof Table) ) {
            return;
          }
        }

        if ( summary.hasOwnProperty('userFilter') === true ) {
          user = summary
            .userFilter
            .split(',')
            .map(function(e) {
              return e.trim();
            })
            .filter(function(e) {
              return e != '';
            });
        }

        var filters = [
          function filterByName(item) {
            if ( summary.filterByName === true ) {
              if ( user.length > 0 ) {
                return user.indexOf(item[0]) > -1;
              }
            }
            return true;
          },
          function filterByRange(item) {
            if ( summary.filterByRange === true ) {
              var a = moment(summary.initialDay, $scope.DATE_FORMAT);
              var b = moment(summary.finalDay, $scope.DATE_FORMAT);
              var c = moment(item[7]);
              if ( a.isValid() === true && b.isValid() === true ) {
                var da = c.diff(a);
                var db = c.diff(b);
                return Math.sign(da) * Math.sign(db) <= 0;
              }
              return false;
            }
            return true;
          },
          function filterByRange(item) {
            if ( summary.filterByState === true ) {
              return summary.state === item[1];
            }
            return true;
          },
          function filterByAssignees(item) {
            if ( summary.filterByAssignee === true ) {
              if ( item.length >= 9 ) {
                return item[8].split(',').indexOf(summary.assignee) > -1;
              }
              return false;
            }
            return true;
          }
        ];

        var __filter = function __filter(cm) {
          var res = true;
          var i, len = filters.length;

          for (i = 0; i < len; i += 1) {
            res = res && filters[i](cm);
          }

          return res;

        };

        var customAdder = function customAdder(sum, val) {
          return [ sum[0] + 1 ];
        };

        var rows, label, labels = [ 'Commits', 'Pulls', 'Issues' ];
        var dict = [];
        var fnd;

        for (var i = 0; i < tables.length; i += 1) {

          if ( summary.showGraphics[i] === false ) {
            continue;
          }

          if (tables[i].dimensions.indexOf(summary.dimension) === -1) {
            continue;
          }

          rows = tables[i]
            .dice(__filter)
            .rollup(summary.dimension, ['year'], customAdder, [0])
            .rows
            .filter(function(e) {
              return e[0] != '';
            });

          /*if ( summary.dimension === 'authorName' ) {
            label = 'Stats per user';
          } else //*/
          if ( summary.dimension === 'day' ) {
            $scope.mergeSort(rows, function(a, b) {
              return $scope.DAYS.indexOf(a[0]) <= $scope.DAYS.indexOf(b[0]);
            });
          } else if ( summary.dimension === 'month' ) {
            $scope.mergeSort(rows, function(a, b) {
              return $scope.MONTHS.indexOf(a[0]) <= $scope.MONTHS.indexOf(b[0]);
            });
          } else if ( summary.dimension === 'year' || summary.dimension === 'hour' ) {
            $scope.mergeSort(rows, function(a, b) {
              return (~~a[0]) <= (~~b[0]);
            });
          }

          for (var j = 0, max = rows.length; j < max; j += 1) {
            fnd = false;
            for (var k = 0, max1 = dict.length; k < max1; k += 1) {
              if ( rows[j][0] === dict[k][0] ) {
                fnd = true;
                dict[k][i + 1] = rows[j][1];
                break;
              }
            }
            if ( fnd === false ) {
              dict.push([ rows[j][0] ]);
              dict[ dict.length - 1 ][i + 1] = rows[j][1];
            }
          }

        }

        var dim = dict.map(function(e) { return ( ['authorName', 'assignee'].indexOf(summary.dimension) > -1 ?'@':'') + e[0]; });
        var dim1 = [];
        var values = tables.map(function(e, idx) { return dict.map(function(e) { return ~~e[idx + 1]; }); });
        var values1 = tables.map(function() { return []; });

        var colors = [ 'rgb(2, 181, 36)', 'rgb(255, 99, 132)', 'rgb(38, 128, 246)' ];
        var MAX_CANT = 25, len;

        if ( dim.length > MAX_CANT ) {
          len = dim.length >> 1;
          dim1 = dim.slice(len, dim.length);
          dim = dim.slice(0, len);

          for (var i = 0; i < values.length; i += 1) {
            values1[i] = values[i].slice(len, values[i].length);
            values[i] = values[i].slice(0, len);
          }
          summary.olap2 = true;
        } else {
          summary.olap2 = false;
        }

        summary.olap1 = true;

        var datasets = [];
        var datasets1 = [];

        for (var i = 0; i < tables.length; i += 1) {
          if (summary.showGraphics[i] === true) {
            datasets.push({
              label: labels[i],
              backgroundColor: colors[i],
              borderColor: colors[i],
              data: values[i],
              fill: false
            });

            datasets1.push({
              label: labels[i],
              backgroundColor: colors[i],
              borderColor: colors[i],
              data: values1[i],
              fill: false
            });
          }
        }

        $scope.charts.olap1.data = {
          labels : dim,
          datasets : datasets
          /*[
            {
              label : labels[0],
              backgroundColor : colors[0],
              borderColor : colors[0],
              data: values[0],
              fill : false
            },
            {
              label : labels[1],
              backgroundColor : colors[1],
              borderColor : colors[1],
              data: values[1],
              fill : false
            }
          ]//*/
        };

        $scope.charts.olap2.data = {
          labels : dim1,
          datasets : datasets1
          /*[
            {
              label : label,
              backgroundColor : colors[0],
              borderColor : colors[0],
              data: cant1,
              fill : false
            }
          ]//*/
        };


        $scope.charts.olap1.update();
        $scope.charts.olap2.update();

      };

      $scope.getStats = function getStats() {

        var url = '/json/all_stats.json';

        $scope.commitsError = false;

        $http
          .get(url)
          .success(function(data) {

            $scope.commits = data.commits;
            $scope.pullRequests = data.pullRequests;
            $scope.issues = data.issues;
            $scope.users = data.users;
            $scope.references = data.references;
            $scope.contribs = data.contribs;
            $scope.stats = data.stats;

            $scope.createCommitCube($scope.commits);
            $scope.createPullCube($scope.pullRequests);
            $scope.createIssueCube($scope.issues);

            $scope.setPage('cm', 1);
            $scope.setPage('is', 1);
            $scope.setPage('pr', 1);

          })
          .catch(function(err) {
          });

      };

      $scope.generateMetrics = function generateMetrics() {

        //DEBUG($scope.owner, $scope.repo);

        $scope.init();

        setTimeout($scope.getStats, 0);
        //setTimeout($scope.getIssues, 0);
        //setTimeout($scope.getPullRequests, 0);
        //setTimeout($scope.getContribs, 0);
        //setTimeout($scope.getPunchCard, 0);

      };

      $scope.generateCharts = function generateCharts() {

        $scope.charts = {};

        for (var i in $scope.canvas) {
          if ( $scope.canvas.hasOwnProperty(i) === true ) {
            $scope.canvas[i].fontSize = '1.3em';
            $scope.charts[ i.toString() ] = new Chart( $scope.canvas[i], {
              type: "bar",
              data : {
                datasets: [
                ]
              },
              options: {
                maintainAspectRatio: false
              }
            });
          }
        }

      };

      $scope.generateCharts();

    }
  ]);

}());