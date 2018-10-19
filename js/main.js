(function() {

  var myApp = angular.module('metricsGenerator', []);

  myApp.controller('metricsController', [
    '$scope',
    '$http',
    function($scope, $http) {

      Chart.defaults.global.defaultFontSize = 18;

      $scope.owner = '';
      $scope.repo = '';

      $scope.ISSUES_TMPL = 'http://api.github.com/repos/:owner/:repo/issues';
      $scope.PULL_REQ_TMPL = 'http://api.github.com/repos/:owner/:repo/pulls';
      $scope.DATE_FORMAT = 'DD/MM/YYYY';
      $scope.DAYS = moment.weekdays();
      $scope.DEBUG_MODE = true;

      $scope.issuesError = false;
      $scope.pullRequestError = false;
      $scope.commitsError = false;
      $scope.userOrder = false;

      $scope.references = {};
      $scope.contribs = {};
      $scope.selectedWeek = {};
      $scope.users = [];
      $scope.commits = [];
      $scope.issues = [];
      $scope.pullRequests = [];
      $scope.contribKeys = [];
      $scope.punchCard = [];

      $scope.selectedTab = 0;
      $scope.totalTabs = 2;

      $scope.doc = document;

      $scope.canvas = {
        commitsPerHour: $scope.doc.getElementById('commitsPerHour').getContext('2d'),
        contribsPerWeek: $scope.doc.getElementById('contribsPerWeek').getContext('2d'),
      };

      $scope.charts = {};

      var DEBUG = function DEBUG() {

        if ( $scope.DEBUG_MODE === true ) {
          console.log.apply(null, arguments);
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

      $scope.getCommitsPerHour = function getCommitsPerHour() {

        var len = $scope.commits.length;
        var arr = [];
        var labels = [];
        var colors = [ 'rgb(255, 99, 132)' ];

        for(var i = 0; i < 24; i += 1) {
          arr.push(0);
          labels.push(i.toString());
        }

        for (var i = 0; i < len; i += 1) {
          arr[ ~~$scope.commits[i].created_at_moment.format('h') ] += 1;
        }

        $scope.charts.commitsPerHour.data = {
          labels : labels,
          datasets : [
            {
              label : "Commits per hour",
              backgroundColor : colors[0],
              borderColor : colors[0],
              data : arr,
              fill : false
            }
          ]
        };

        $scope.charts.commitsPerHour.update();

      };

      $scope.isReference = function isReference(str) {

        if ( str.length > 0 ) {
          if ( str[0] === '#' ) {
            for ( var i = 1, j = str.length; i < j; i += 1) {
              if ( ("0123456789").indexOf(str[i]) === -1 ) {
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
          if ( $scope.isReference(str[i]) === true ) {
            str[i] = parseInt(str[i].substr(1, str[i].length - 1));
            if ( $scope.references.hasOwnProperty(str[i]) === true ) {
              $scope.references[ str[i] ] += 1;
            } else {
              $scope.references[ str[i] ] = 1;
            }
          }
        }

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

      $scope.selectWeek = function selectWeek(wk) {

        if ( $scope.contribs.hasOwnProperty(wk) === true ) {

          var cntb = $scope.contribs[wk];
          var len = cntb.length;
          var i;

          $scope.selectedWeek = cntb;

          var name = moment.unix(wk).format('MMMM D');

          var labels = [];
          var data1 = [];
          var data2 = [];
          var data3 = [];

          var colors = [ 'rgb(2, 181, 36)', 'rgb(255, 99, 132)', 'rgb(38, 128, 246)' ];

          for (i = 0; i < len; i += 1) {
            if ( ~~cntb[i].a + ~~cntb[i].d + ~~cntb[i].c > 0) {
              labels.push('@' + cntb[i].user);
              data1.push(cntb[i].a);
              data2.push(cntb[i].d);
              data3.push(cntb[i].c);
            }
          }

          $scope.charts.contribsPerWeek.data = {
            labels : labels,
            datasets : [
              {
                label : "Added",
                backgroundColor : colors[0],
                borderColor : colors[0],
                data : data1,
                fill : false
              },
              {
                label : "Deleted",
                backgroundColor : colors[1],
                borderColor : colors[1],
                data : data2,
                fill : false
              },
              {
                label : "Commits",
                backgroundColor : colors[2],
                borderColor : colors[2],
                data : data3,
                fill : false
              }
            ]
          };

          $scope.charts.contribsPerWeek.update();

        }

      };

      $scope.addCommit = function addCommit(commit) {

        var user = commit.commit.author;
        var authorInfo = commit.author;

        var len = $scope.users.length;
        var id;

        if ( authorInfo != null ) {
          id = authorInfo.login;
        } else {
          id = user.email;
        }

        for (var i = 0; i < len; i += 1) {
          if ( $scope.users[i].id === id ) {
            $scope.users[i].name = user.name;
            $scope.users[i].commits += 1;
            return;
          }
        }

        $scope.users.push({
          name: user.name,
          id: id,
          commits: 1,
          pulls: 0,
          issues: 0
        });

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

      $scope.addPullRequest = function addPullRequest(username) {

        var len = $scope.users.length;

        for (var i = 0; i < len; i += 1) {
          if ( $scope.users[i].id === username ) {
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

      $scope.parseIssues = function parseIssues(data) {

        var i, len = data.length;

        var model = {
          created_at: moment,
          closed_at: moment
        };

        for (i = 0; i < len; i += 1) {

          $scope.addReferences(data[i].title);

          for (var j in model) {
            if ( model.hasOwnProperty(j) === true ) {
              if ( data[i][j] ) {
                data[i][j] = model[j]( data[i][j] ).format($scope.DATE_FORMAT);
              } else {
                //DEBUG(data[i][j]);
                data[i][j] = '--';
              }
            }
          }
          $scope.addIssue(data[i].user.login);
        }

        DEBUG('USERS parseIssues: ', $scope.users);

        return data;

      };

      $scope.parseCommits = function parseCommits(data) {

        var i, len = data.length;

        for (i = 0; i < len; i += 1) {
          $scope.addCommit(data[i]);
          data[i].created_at_moment = moment(data[i].commit.author.date);
          data[i].created_at = data[i].created_at_moment.format($scope.DATE_FORMAT);
          data[i].message = data[i].message || '<no-message>';
          $scope.addReferences(data[i].message);
          //data[i].message = data[i].message.replace(/\r/g, '').replace(/\n/g, '<br>');
        }//*/

        DEBUG('USERS parseCommits: ', $scope.users);

        return data;

      };

      $scope.parsePullRequests = function parsePullRequests(data) {

        var i, len = data.length;

        var model = {
          created_at: moment,
          closed_at: moment,
          merged_at: moment
        };

        for (i = 0; i < len; i += 1) {

          $scope.addReferences(data[i].title);

          for (var j in model) {
            if ( model.hasOwnProperty(j) === true ) {
              DEBUG( j, data[i][j] );

              data[i][j + '_moment'] = model[j]( data[i][j] );

              if ( data[i][j] ) {
                data[i][j] = model[j]( data[i][j] ).format($scope.DATE_FORMAT);
                DEBUG(j, data[i][j]);
              } else {
                //DEBUG('invalid date:', data[i][j]);
                data[i][j] = '--';
              }
            }
          }

          $scope.addPullRequest(data[i].head.user.login);

          data[i].timeToMerge = $scope.getTimeToMerge(
            data[i].created_at_moment,
            data[i].merged_at_moment
          );

        }

        return data;

      };

      $scope.parseContribs = function parseContribs(data) {

        var len = data.length, len1;
        var i, j, weeks;

        $scope.contribs = {};

        for (i = 0; i < len; i += 1) {

          if ( data[i].author && data[i].weeks ) {

            weeks = data[i].weeks;

            len1 = weeks.length;

            for (j = 0; j < len1; j += 1) {

              if ( $scope.contribs.hasOwnProperty(weeks[j].w) === false ) {
                $scope.contribs[weeks[j].w] = [];
              }

              $scope.contribs[weeks[j].w].push({
                user: data[i].author.login,
                w: weeks[j].w,
                a: weeks[j].a,
                d: weeks[j].d,
                c: weeks[j].c
              });

            }

          }

        }

        $scope.contribKeys = Object.keys($scope.contribs);

        len = $scope.contribKeys.length - 1;

        for (i = len; i >= 0; i -= 1) {
          if ( $scope.contribs.hasOwnProperty($scope.contribKeys[i]) === false ) {
            $scope.contribKeys.splice(i, 1);
            len -= 1;
          }
        }

        $scope.selectWeek( $scope.contribKeys[len] );

        DEBUG($scope.contribs);

      };

      $scope.selectPunchCardDay = function selectPunchCardDay(d) {

        var colors = [ 'rgb(147, 81, 255)' ];

        d = ~~d;

        DEBUG('Selected Day: ', d);

        if ( d >= 0 && d < 7 ) {

          var labels = [];

          for(var i = 0; i < 24; i += 1) {
            labels.push( moment().hours(i).format('ha') );
          }

          $scope.charts.commitsPerHour.type = "bar";
          $scope.charts.commitsPerHour.data = {
            labels : labels,
            datasets : [
              {
                label : "Commits per hour",
                backgroundColor : colors[0],
                borderColor : colors[0],
                data : $scope.punchCard[ d ],
                fill : false
              }
            ]
          };

          $scope.charts.commitsPerHour.update();

        }

      };

      $scope.parsePunchCard = function parsePunchCard(data) {

        var len = data.length;
        var i, j, arr = [];

        $scope.punchCard.length = 0;

        for (i = 0; i < 7; i += 1) {

          arr = [];

          for (j = 0; j < 24; j += 1) {
            arr.push(0);
          }

          $scope.punchCard.push( arr );

        }

        for (i = 0; i < len; i += 1) {

          $scope.punchCard[ data[i][0] ][ data[i][1] ] = data[i][2];

        }

        $scope.selectPunchCardDay(0);

      };

      $scope.getPunchCard = function getPunchCard() {

        var url = '/json/punch_card.json';

        $http
          .get(url)
          .success(function(data) {

            DEBUG('Punch Card: ', data);
            $scope.parsePunchCard(data);

          })
          .catch(function(err) {
            DEBUG('Punch Card Error: ', err);
          });

      };

      $scope.getContribs = function getContribs() {

        var url = '/json/contribs.json';

        $http
          .get(url)
          .success(function(data) {

            $scope.parseContribs(data);

          })
          .catch(function(err) {
            DEBUG('Contribs Error: ', err);
          });

      };

      $scope.getTimeToMerge = function getTimeToMerge(ma, mb) {

        if ( ma.isValid() === false || mb.isValid() === false ) {
          return '--';
        }

        var times = [ 'years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds' ];
        var offset = 0;
        var val = 0;

        for (var i = 0, max = times.length; i < max && val == 0; i += 1) {

          val = mb.diff(ma, times[i]);
          offset = i;

        }

        DEBUG('Diff: ', val, times[offset]);

        var resp = times[offset];

        if ( val === 1 ) {
          resp = resp.substr(0, resp.length - 1);
        }

        return val + ' ' + resp;

      };

      $scope.getIssues = function getIssues() {

        var url = '/json/issues.json';

        $scope.issuesError = false;

        $http
          .get(url)
          .success(function(data) {

            DEBUG(url);
            DEBUG(data);

            $scope.issues = $scope.parseIssues(data);

            DEBUG('Parsed issues: ', $scope.issues);

          })
          .catch(function(err) {

            DEBUG('ISSUES ERROR: ', err);

            $scope.issuesError = true;

          });

      };

      $scope.getReviews = function getReviews(pr) {

        $http
          .get('/json/review-' + pr.number +  '.json')
          .success(function(rv) {

            DEBUG('Review #' + pr.number, rv);
            pr.reviews = rv;

          })
          .catch(function(err) {
            DEBUG('ERROR Trying to fecth review #' + pr.number);
          });

      };

      $scope.getPullRequests = function getPullRequests() {

        var url = '/json/pr.json';

        $scope.pullRequestError = false;

        $http
          .get(url)
          .success(function(data) {

            DEBUG(url);
            DEBUG(data);

            $scope.pullRequests = $scope.parsePullRequests(data);

            var len = $scope.pullRequests.length;

            for (var i = 0; i < len; i += 1) {
              $scope.pullRequests[i].reviews = [];
              $scope.getReviews( $scope.pullRequests[i] );
            }

            DEBUG('Parsed pr: ', $scope.pullRequests);

          })
          .catch(function(err) {

            DEBUG('PR ERROR: ', err);

            $scope.pullRequestError = true;

          });

      };

      $scope.getCommits = function getCommits() {

        var url = '/json/commits.json';

        $scope.commitsError = false;

        $http
          .get(url)
          .success(function(data) {

            DEBUG(url);
            DEBUG(data);

            $scope.commits = $scope.parseCommits(data);
            //$scope.getCommitsPerHour();

          })
          .catch(function(err) {

            DEBUG('COMMIT ERROR: ', err);

            $scope.commitsError = true;

          });

      };

      $scope.generateMetrics = function generateMetrics() {

        DEBUG($scope.owner, $scope.repo);

        $scope.users.length = 0;
        $scope.commits.length = 0;
        $scope.issues.length = 0;
        $scope.pullRequests.length = 0;
        $scope.references = {};
        $scope.contribs = {};

        setTimeout($scope.getIssues, 0);
        setTimeout($scope.getPullRequests, 0);
        setTimeout($scope.getCommits, 0);
        setTimeout($scope.getContribs, 0);
        setTimeout($scope.getPunchCard, 0);

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