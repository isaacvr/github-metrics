(function () {

  var minimatch = require('minimatch');

  var myApp = angular.module('metricsGenerator', ['ui']);

  myApp.controller('metricsController', [
    '$scope',
    '$http',
    function ($scope, $http) {

      Chart.defaults.global.defaultFontSize = 18;

      var Table = require('olap-cube').model.Table;

      $scope.DATE_FORMAT = 'DD/MM/YYYY';
      $scope.DAYS = moment.weekdays();
      $scope.MONTHS = moment.months();
      $scope.DEBUG_MODE = true;
      $scope.PULLS_PER_PAGE = 30;
      $scope.ISSUES_PER_PAGE = 30;
      $scope.COMMITS_PER_PAGE = 30;
      $scope.PR_STATES = ['all', 'open', 'closed'];
      $scope.IS_STATES = ['all', 'open', 'closed'];
      $scope.selectedMonth = moment('2000-01-00T00:00:00Z').format('MMMM');
      $scope.owner = 'simelo';
      $scope.repo = 'skycoin-hardware-wallet-go';

      $scope.owner1 = 'skycoin';
      $scope.repo1 = 'hardware-wallet-go'; //$scope.repo;
      
      $scope.vsRepo = false;

      $scope.selectedTab = 0;
      $scope.totalTabs = 2;

      $scope.summary = {
        olap1: false,
        olap2: false,
        initialDay: '1/2/2019',
        finalDay: '28/2/2019',
        userFilter: 'olemis, stdev*',
        filterByName: true,
        filterByRange: true,
        filterByState: false,
        dimension: 'authorName',
        showGraphics: [ true, true, true, true]
      };

      $scope.doc = document;

      $scope.canvas = {
        olap1: $scope.doc.getElementById('olap1').getContext('2d'),
        olap2: $scope.doc.getElementById('olap2').getContext('2d')
      };

      $scope.charts = {};

      $scope.createOrEmpty = function createOrEmpty(id) {

        if (Array.isArray($scope[id]) === true) {
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

        if ($scope.DEBUG_MODE === true) {
          console.log.apply(null, arguments);
        }

      };

      $scope.scrollTop = function scrollTop() {

        var ini = window.scrollY;
        var i = 0;

        var itv = setInterval(function () {

          window.scroll(0, ini - ini * Math.sqrt(i));

          if (i >= 1) {
            clearInterval(itv);
          }

          i += 0.01;

        }, 5);

      };

      $scope.setPage = function setPage(name, num) {

        var tot, ppp, cant;

        if (name === 'pr') {
          tot = $scope.stats.pr[$scope.pullState];
          ppp = $scope.PULLS_PER_PAGE;
          cant = Math.floor((tot - 1) / ppp) + 1;

          if (num < 1 || num > cant) {
            return;
          }

          $scope.pagination[name] = num;
          $scope.updatePullRequestFilter(true);

        } else if (name === 'is') {
          tot = $scope.stats.is[$scope.issueState];
          ppp = $scope.ISSUES_PER_PAGE;
          cant = Math.floor((tot - 1) / ppp) + 1;

          if (num < 1 || num > cant) {
            return;
          }

          $scope.pagination[name] = num;
          $scope.updateIssueFilter(true);

        } else if (name === 'cm') {
          tot = $scope.stats.cm;
          ppp = $scope.COMMITS_PER_PAGE;
          cant = Math.floor((tot - 1) / ppp) + 1;

          if (num < 1 || num > cant) {
            return;
          }

          $scope.pagination[name] = num;
          $scope.updateCommitFilter(true);

        }

      };

      $scope.mergeSort = function mergeSort(arr, fn) {

        var len = arr.length;

        if (len < 2) {
          return;
        }

        var merge = function merge(__arr, ini, mid, fin) {

          var a = ini, b = mid + 1;
          var res = [];

          while (a <= mid || b <= fin) {
            if (a <= mid && b <= fin) {
              if (fn(__arr[a], __arr[b]) === true) {
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

        if (change === true) {
          $scope.setPage('cm', 1);
          return;
        }

        var tot = $scope.stats.cm;
        var ppp = $scope.COMMITS_PER_PAGE;
        var cant = Math.floor((tot - 1) / ppp) + 1;

        $scope._tempCm = new Array(cant);

        $scope.commitCant = ppp;
        var page = $scope.pagination.cm;
        $scope.commitOffset = (page - 1) * ppp;

        $scope.filteredCommits = $scope.commits.filter($scope.commitFilter);

      };

      $scope.updateIssueFilter = function updateIssueFilter(change) {

        change = !change;

        if (change === true) {
          $scope.setPage('is', 1);
          return;
        }

        var tot = $scope.stats.is[$scope.issueState];
        var ppp = $scope.ISSUES_PER_PAGE;
        var cant = Math.floor((tot - 1) / ppp) + 1;

        $scope._tempIs = new Array(cant);

        $scope.issueCant = ppp;
        var page = $scope.pagination.is;
        $scope.issueOffset = (page - 1) * ppp;

        $scope.filteredIssues = $scope.issues.filter($scope.issueFilter);

      };

      $scope.updatePullRequestFilter = function updatePullRequestFilter(change) {

        change = !change;

        if (change === true) {
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

      };

      /// FILTERS
      $scope.commitFilter = function commitFilter(cm, idx, arr) {

        if ($scope.commitCant === 0) {
          return false;
        }

        if ($scope.commitOffset === 0) {
          $scope.commitCant -= 1;
          return true;
        } else {
          $scope.commitOffset -= 1;
          return false;
        }

      };

      $scope.issueFilter = function issueFilter(is, idx, arr) {

        if ($scope.issueCant === 0) {
          return false;
        }

        if ($scope.issueState === 'all' || $scope.issueState === is.state) {
          if ($scope.issueOffset === 0) {
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

      $scope.selectTab = function selectTab(tb) {

        tb = ~~tb;

        if (tb >= 0 && tb < $scope.totalTabs) {
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

      $scope.getContribDate = function getContribDate(dt) {

        return moment.unix(dt).format('MMMM D, YYYY');

      };

      /// Cube creators
      $scope.createCommitCube = function createCommitCube(commits, code) {

        var i, len = commits.length;
        var points = [];
        var data = [], mdata;

        for (i = 0; i < len; i += 1) {

          var obj = {
            sha: commits[i].sha,
            authorName: commits[i].commit.author.name,
            authorId: commits[i].commit.author.email,
            date: commits[i].commit.author.date,
            message: commits[i].commit.message,
            tree: commits[i].commit.tree.sha,
            comment_count: commits[i].commit.comment_count
          };

          if (commits[i].author != null) {
            obj.authorName = commits[i].author.login;
            obj.authorId = commits[i].author.id;
          }

          mdata = moment(obj.date);
          mdata.utcOffset(0);

          points.push([
            obj.authorName,
            obj.authorId,
            mdata.format('dddd'),
            mdata.format('MMMM'),
            mdata.format('YYYY'),
            mdata.format('HH'),
            mdata.format('mm'),
            obj.date
          ]);

          data.push([
            obj.sha,
            obj.message,
            obj.tree,
            obj.comment_count
          ]);
        }

        $scope['commitsTable' + code] = new Table({
          dimensions: ['authorName', 'authorId', 'day', 'month', 'year', 'hour', 'minute', 'date'],
          points: points,
          fields: ['sha', 'message', 'tree', 'comment_count'],
          data: data
        });

      };

      $scope.createPullCube = function createPullCube(pulls, code) {

        var i, len = pulls.length;
        var points = [];
        var data = [], mdata;

        for (i = 0; i < len; i += 1) {

          var obj = {
            state: pulls[i].state,
            authorName: pulls[i].user.login,
            authorId: pulls[i].user.id,
            date: pulls[i].created_at_first,
            labels: pulls[i].labels
          };

          mdata = moment(obj.date);
          mdata.utcOffset(0);

          points.push([
            obj.authorName,
            obj.state,
            mdata.format('dddd'),
            mdata.format('MMMM'),
            mdata.format('YYYY'),
            mdata.format('HH'),
            mdata.format('mm'),
            obj.date
          ]);

          data.push([
            obj.labels
          ]);
        }

        $scope['pullsTable' + code] = new Table({
          dimensions: ['authorName', 'state', 'day', 'month', 'year', 'hour', 'minute', 'date'],
          points: points,
          fields: ['labels'],
          data: data
        });

      };

      $scope.createIssueCube = function createIssueCube(issues, code) {
        var i, len = issues.length;
        var points = [];
        var data = [], mdata;

        for (i = 0; i < len; i += 1) {

          var obj = {
            state: issues[i].state,
            authorName: issues[i].user.login,
            authorId: issues[i].user.id,
            date: issues[i].created_at_first,
            labels: issues[i].labels,
            number: issues[i].number
          };
          
          mdata = moment(obj.date);
          mdata.utcOffset(0);

          if (issues[i].assignees.length === 0) {  

            points.push([
              obj.authorName,
              obj.state,
              mdata.format('dddd'),
              mdata.format('MMMM'),
              mdata.format('YYYY'),
              mdata.format('HH'),
              mdata.format('mm'),
              obj.date,
              ''
            ]);

            data.push([
              obj.labels,
              obj.number
            ]);
          }

          for (var j = 0; j < issues[i].assignees.length; j += 1) {

            points.push([
              (j === 0) ? obj.authorName : '',
              obj.state,
              mdata.format('dddd'),
              mdata.format('MMMM'),
              mdata.format('YYYY'),
              mdata.format('HH'),
              mdata.format('mm'),
              obj.date,
              issues[i].assignees[j].login
            ]);

            data.push([
              obj.labels,
              obj.number
            ]);
          }
        }

        $scope['issuesTable' + code] = new Table({
          dimensions: ['authorName', 'state', 'day', 'month', 'year', 'hour', 'minute', 'date', 'assignee'],
          points: points,
          fields: ['labels', 'number'],
          data: data
        });

      };

      $scope.createEventCube = function createEventCube(events, code) {
        
        var i, len = events.length;
        var points = [];
        var mdata;

        for (i = 0; i < len; i += 1) {

          if (events[i].actor === null) {
            events[i].actor = { login: '' };
          }

          var obj = {
            state: events[i].event,
            authorName: events[i].actor.login,
            date: events[i].created_at,
            issueNumber: events[i].issue.number
          };
          
          mdata = moment(obj.date);
          mdata.utcOffset(0);

          points.push([
            obj.authorName,
            obj.state,
            mdata.format('dddd'),
            mdata.format('MMMM'),
            mdata.format('YYYY'),
            mdata.format('HH'),
            mdata.format('mm'),
            obj.date,
            obj.issueNumber
          ]);
        }

        $scope['eventsTable' + code] = new Table({
          dimensions: ['authorName', 'state', 'day', 'month', 'year', 'hour', 'minute', 'date', 'issue'],
          points: points,
          fields: ['other'],
          data: points.map(() => { return [0]; })
        });
      };

      // Returns true if a <= c && c <= b
      $scope.isInside = function isInside(a, b, c) {

        var a_y = ~~a.format('YYYY'), a_m = ~~a.format('MM'), a_d = ~~a.format('DD');
        var b_y = ~~b.format('YYYY'), b_m = ~~b.format('MM'), b_d = ~~b.format('DD');
        var c_y = ~~c.format('YYYY'), c_m = ~~c.format('MM'), c_d = ~~c.format('DD');
      
        var da = moment(a_d + '/' + a_m + '/' + a_y, $scope.DATE_FORMAT);
        var db = moment(b_d + '/' + b_m + '/' + b_y, $scope.DATE_FORMAT);
        var dc = moment(c_d + '/' + c_m + '/' + c_y, $scope.DATE_FORMAT);

        da.utcOffset(0);
        db.utcOffset(0);
        dc.utcOffset(0);

        var _da = dc.diff(da);
        var _db = dc.diff(db);

        return Math.sign(_da) * Math.sign(_db) <= 0;

      };

      $scope.getSummary = function getSummary() {

        var code1 = $scope.owner + '_' + $scope.repo,
          code2 = $scope.owner1 + '_' + $scope.repo1;

        var tables = [
          $scope['commitsTable' + code1],
          $scope['pullsTable' + code1],
          $scope['issuesTable' + code1]
        ];

        var tables1 = [
          $scope['commitsTable' + code2],
          $scope['pullsTable' + code2],
          $scope['issuesTable' + code2]
        ];

        var summary = $scope.summary;
        var user = [];

        for (var i = 0; i < tables.length; i += 1) {
          if (!(tables[i] instanceof Table)) {
            return;
          }
        }

        if (summary.hasOwnProperty('userFilter') === true) {
          user = summary
            .userFilter
            .split(',')
            .map(function (e) {
              return e.trim();
            })
            .filter(function (e) {
              return e != '';
            });
        }

        var filters = [
          function filterByName(item) {
            var name = item[0];

            if (summary.filterByName === true) {
              if ( item.length > 8 ) {
                if ( name == '' ) {
                  return false;
                }
              }
              if (user.length > 0) {
                var res = false;

                for (var i = 0; i < user.length && res === false; i += 1) {
                  res = res || minimatch(name, user[i]);
                }

                return res;
              }
            }
            return true;
          },
          function filterByRange(item) {
            if (summary.filterByRange === true) {
              var a = moment(summary.initialDay, $scope.DATE_FORMAT);
              var b = moment(summary.finalDay, $scope.DATE_FORMAT);
              var c = moment(item[7]);
              if (a.isValid() === true && b.isValid() === true && c.isValid() === true) {
                return $scope.isInside(a, b, c);
              }
              return false;
            }
            return true;
          },
          function filterByState(item) {
            if ( summary.dimension === 'closer' ) {
              return item[1] === 'closed';
            } else if (summary.filterByState === true) {
              return summary.state === item[1];
            }
            return true;
          },
          function filterByAssignees(item) {
            if (summary.filterByAssignee === true) {
              if (item.length >= 9) {
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

          for (i = 0; i < len && res === true; i += 1) {
            res = res && filters[i](cm);
          }

          return res;

        };

        var customAdder = function customAdder(sum, val) {
          return [sum[0] + 1];
        };

        var rows, labels = ['Commits', 'Pulls', 'Issues'];
        var dict = [];
        var fnd;
        var issuesList = [], eventTable, _temp;

        for (var i = 0; i < tables.length; i += 1) {

          if (summary.showGraphics[i + 1] === false) {
            continue;
          }

          if ( i + 1 === tables.length && summary.dimension === 'closer' ) {
            _temp = $scope['eventsTable' + ((!!$scope.vsRepo) ? code2 : code1) ];
          } else {
            _temp = tables[i];
            if (_temp.dimensions.indexOf(summary.dimension) === -1) {
              continue;
            }
          }

          rows = _temp
            .dice(__filter)
            .rollup((summary.dimension === 'closer') ? 'authorName' : summary.dimension, ['year'], customAdder, [0])
            .rows
            .filter(function (e) {
              return e[0] != '';
            });
          
          console.log('Rows: ', i, rows);

          if (summary.dimension === 'day') {
            $scope.mergeSort(rows, function (a, b) {
              return $scope.DAYS.indexOf(a[0]) <= $scope.DAYS.indexOf(b[0]);
            });
          } else if (summary.dimension === 'month') {
            $scope.mergeSort(rows, function (a, b) {
              return $scope.MONTHS.indexOf(a[0]) <= $scope.MONTHS.indexOf(b[0]);
            });
          } else if (summary.dimension === 'year' || summary.dimension === 'hour') {
            $scope.mergeSort(rows, function (a, b) {
              return (~~a[0]) <= (~~b[0]);
            });
          }

          for (var j = 0, max = rows.length; j < max; j += 1) {
            fnd = false;
            for (var k = 0, max1 = dict.length; k < max1; k += 1) {
              if (rows[j][0] === dict[k][0]) {
                fnd = true;
                if (dict[k][i + 1]) {
                  dict[k][i + 1][0] = rows[j][1];
                } else {
                  dict[k][i + 1] = [ rows[j][1], 0 ];
                }
                break;
              }
            }
            if (fnd === false) {
              dict.push([rows[j][0]]);
              dict[dict.length - 1][i + 1] = [rows[j][1], 0];
            }
          }

        }

        if ( !!$scope.vsRepo ) {
          for (var i = 0; i < tables1.length; i += 1) {

            if (summary.showGraphics[i + 1] === false) {
              continue;
            }

            if (tables1[i].dimensions.indexOf(summary.dimension) === -1) {
              continue;
            }

            rows = tables1[i]
              .dice(__filter)
              .rollup(summary.dimension, ['year'], customAdder, [0])
              .rows
              .filter(function (e) {
                return e[0] != '';
              });

            if (summary.dimension === 'day') {
              $scope.mergeSort(rows, function (a, b) {
                return $scope.DAYS.indexOf(a[0]) <= $scope.DAYS.indexOf(b[0]);
              });
            } else if (summary.dimension === 'month') {
              $scope.mergeSort(rows, function (a, b) {
                return $scope.MONTHS.indexOf(a[0]) <= $scope.MONTHS.indexOf(b[0]);
              });
            } else if (summary.dimension === 'year' || summary.dimension === 'hour') {
              $scope.mergeSort(rows, function (a, b) {
                return (~~a[0]) <= (~~b[0]);
              });
            }

            for (var j = 0, max = rows.length; j < max; j += 1) {
              fnd = false;
              for (var k = 0, max1 = dict.length; k < max1; k += 1) {
                if (rows[j][0] === dict[k][0]) {
                  fnd = true;
                  if (dict[k][i + 1]) {
                    dict[k][i + 1][1] = rows[j][1];
                  } else {
                    dict[k][i + 1] = [ 0, rows[j][1]];
                  }
                  break;
                }
              }
              if (fnd === false) {
                dict.push([rows[j][0]]);
                dict[dict.length - 1][i + 1] = [0, rows[j][1]];
              }
            }

          }//*/
          eventTable = $scope['eventsTable' + code2];
          issuesList = issuesList.concat( tables1[2].dice(__filter).rows.map((e) => [e[10], 0]) );
          //console.log('Lalala 1:  ', );
        } else {
          eventTable = $scope['eventsTable' + code1];    
          issuesList = issuesList.concat( tables[2].dice(__filter).rows.map((e) => [e[10], 0]) );
          //console.log('Lalala 2:  ', tables[2].dice(__filter).rows);

        }

        issuesList = issuesList.concat(eventTable
                      .dice(function(item) {
                        var i, res = true;
                        if ( ["referenced", "reopened", "assigned", "closed", "merged"].indexOf(item[1]) === -1 ) {
                          return false;
                        }
                        for(i = 0; i < 2 && res === true; i += 1) {
                          res = res && filters[i](item);
                        }
                        return res;
                      })
                      .rollup('issue', ['year'], (sum) => [sum[0] + 1], [0])
                      .rows);//*/

        console.log('Issues List', issuesList);

        $scope.dict = dict.map(function(e) {
          
          var res = [];

          for (var i = 0; i <= tables.length; i += 1) {
            if (i === 0) {
              res.push(e[i]);
            } else {
              if ( !e[i] ) {
                res.push([0, 0]);
              } else {
                res.push([ ~~e[i][0], ~~e[i][1] ]);
              }
            }
          }

          return res;
          
        });

        $scope.labels = labels;

        var dim = dict.map(function (e) { return (['authorName', 'assignee', 'closer'].indexOf(summary.dimension) > -1 ? '@' : '') + e[0]; });
        var dim1 = [];

        var values_r1 = tables.map(function (e, idx) {
          return dict.map(function (e1) {
            if ( e1[ idx + 1 ] ) {
              return ~~e1[idx + 1][0];
            }
            return 0;
          });
        });

        var values_r2;
        
        if ( !!$scope.vsRepo ) {
          values_r2 = tables.map(function (e, idx) {
            return dict.map(function (e1) {
              if ( e1[ idx + 1 ] ) {
                return ~~e1[idx + 1][1];
              }
              return 0;
            });
          });
        }

        var values1_r1 = tables.map(function () { return []; });
        var values1_r2 = tables.map(function () { return []; });

        var MAX_CANT = 25, len;

        if (dim.length > MAX_CANT) {
          len = dim.length >> 1;
          dim1 = dim.slice(len, dim.length);
          dim = dim.slice(0, len);

          for (var i = 0; i < values_r1.length; i += 1) {
            values1_r1[i] = values_r1[i].slice(len, values_r1[i].length);
            values_r1[i] = values_r1[i].slice(0, len);
          }

          if ( !!$scope.vsRepo ) {
            for (var i = 0; i < values_r2.length; i += 1) {
              values1_r2[i] = values_r2[i].slice(len, values_r2[i].length);
              values_r2[i] = values_r2[i].slice(0, len);
            }
          }

          summary.olap2 = true;
        } else {
          summary.olap2 = false;
        }

        summary.olap1 = true;

        var datasets = [];
        var datasets1 = [];
        var label;

        for (var i = 0; i < tables.length; i += 1) {
          if (summary.showGraphics[i + 1] === true) {

            if ( !!$scope.vsRepo ) {              
              
              datasets.push({
                label: labels[i] + ' (' + $scope.owner1 + '/' + $scope.repo1 + ')',
                backgroundColor: randomColor({ luminosity: 'dark' }),
                data: values_r2[i],
                fill: false,
                stack: i.toString()
              });//*/

              label = labels[i] + ' (' + $scope.owner + '/' + $scope.repo + ')'; 

            } else {
              label = labels[i];
            }

            datasets.push({
              label: label,
              backgroundColor: randomColor({ luminosity: 'dark' }),
              data: values_r1[i].map(function(e, idx) {
                if ( i > 0 && !!$scope.vsRepo && summary.dimension !== 'closer') {
                  return 0;
                }//*/
                if ( !!$scope.vsRepo ) {
                  return e - values_r2[i][idx];
                }
                return e;
              }),
              fill: false,
              stack: i.toString()
            });//*/

            if ( !!$scope.vsRepo ) {
              datasets1.push({
                label: labels[i] + ' (' + $scope.owner1 + '/' + $scope.repo1 + ')',
                backgroundColor: randomColor({ luminosity: 'dark' }),
                data: values1_r2[i],
                fill: false,
                stack: i.toString()
              });//*/
            }

            datasets1.push({
              label: label,
              backgroundColor: randomColor({ luminosity: 'dark' }),
              data: values1_r1[i].map(function(e, idx) {
                if ( i > 0 && !!$scope.vsRepo) {
                  return 0;
                }
                if ( !!$scope.vsRepo ) {
                  return e - values1_r2[i][idx];
                }
                return e;
              }),
              fill: false,
              stack: i.toString()
            });//*/

          }
        }

        $scope.charts.olap1.data = {
          labels: dim,
          datasets: datasets
        };

        $scope.charts.olap2.data = {
          labels: dim1,
          datasets: datasets1
        };

        $scope.charts.olap1.options.scales.xAxes[0].stacked = !!$scope.vsRepo;
        $scope.charts.olap1.options.scales.yAxes[0].stacked = !!$scope.vsRepo;

        $scope.charts.olap2.options.scales.xAxes[0].stacked = !!$scope.vsRepo;
        $scope.charts.olap2.options.scales.yAxes[0].stacked = !!$scope.vsRepo;

        $scope.charts.olap1.update();
        $scope.charts.olap2.update();

        var _issues = ( !!$scope.vsRepo ) ? $scope.parentIssues : $scope.issues;
        var _validIssues = issuesList.map((e) => e[0]); 

        console.log('Valid Issues: ', _validIssues);

        $scope.filteredIssues = _issues.filter(function(issue) {
          if ( _validIssues.indexOf(issue.number) > -1 ) {
            console.log(issue);
          }
          return _validIssues.indexOf(issue.number) > -1;
        });

      };

      $scope.getStats = function getStats() {

        var url = '/json_' + $scope.owner + '_' + $scope.repo + '/all_stats.json';
        var url1 = '/json_' + $scope.owner1 + '_' + $scope.repo1 + '/all_stats.json';

        $http
          .get(url)
          .success(function (data) {

            $scope.commits = data.commits;
            $scope.pullRequests = data.pullRequests;
            $scope.issues = data.issues;
            $scope.users = data.users;
            $scope.references = data.references;
            $scope.contribs = data.contribs;
            $scope.stats = data.stats;

            $scope.createCommitCube($scope.commits, $scope.owner + '_' + $scope.repo);
            $scope.createPullCube($scope.pullRequests, $scope.owner + '_' + $scope.repo);
            $scope.createIssueCube($scope.issues, $scope.owner + '_' + $scope.repo);
            $scope.createEventCube(data.events, $scope.owner + '_' + $scope.repo);

            $scope.setPage('cm', 1);
            $scope.setPage('is', 1);
            $scope.setPage('pr', 1);

          })
          .catch(function (err) {
          });

        $http
          .get(url1)
          .success(function (data) {

            $scope.parentIssues = data.issues;

            $scope.createCommitCube(data.commits, $scope.owner1 + '_' + $scope.repo1);
            $scope.createPullCube(data.pullRequests, $scope.owner1 + '_' + $scope.repo1);
            $scope.createIssueCube(data.issues, $scope.owner1 + '_' + $scope.repo1);
            $scope.createEventCube(data.events, $scope.owner1 + '_' + $scope.repo1);

          })
          .catch(function (err) {
          });

      };

      $scope.generateMetrics = function generateMetrics() {

        $scope.init();

        setTimeout($scope.getStats, 0);
        
      };

      $scope.generateCharts = function generateCharts() {

        $scope.charts = {};

        for (var i in $scope.canvas) {
          if ($scope.canvas.hasOwnProperty(i) === true) {
            $scope.canvas[i].fontSize = '1.3em';
            $scope.charts[i] = new Chart($scope.canvas[i], {
              type: "bar",
              data: {
                datasets: [
                ]
              },
              options: {
                maintainAspectRatio: false,
                scales: {
                  xAxes: [{
                    stacked: true
                  }],
                  yAxes: [{
                    stacked: true
                  }]
                }
              }
            });
          }
        }

      };

      $scope.generateCharts();

    }
  ]);

}());