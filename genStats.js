/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var fs = require('fs');
var moment = require('moment');
var path = require('path');

/// Constants
var DATE_FORMAT = 'DD/MM/YYYY';

var generate = function generate(BASE_DIR) {
  /// Final storage
  var commits = [];
  var pulls = [];
  var issues = [];
  var users = [];
  var references = {};
  var events = {};

  var stats = {
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

  /// Utils
  function purge(obj) {

    for (var i in obj) {
      if (obj[i] instanceof moment) {
        delete obj[i];
      } else if (typeof obj[i] === 'object' || Array.isArray(obj[i]) === true) {
        purge(obj[i]);
      }
    }

  }

  function calcPercents() {

    var len = users.length;
    var i;

    for (i = 0; i < len; i += 1) {
      users[i].issuesPercent = getPercent(users[i].issues, stats.is.all);
      users[i].pullsPercent = getPercent(users[i].pulls, stats.pr.all);
      users[i].commitsPercent = getPercent(users[i].commits, stats.cm);
    }

    stats.is.openPercent = getPercent(stats.is.open, stats.is.all);
    stats.is.closedPercent = getPercent(stats.is.closed, stats.is.all);

    stats.pr.openPercent = getPercent(stats.pr.open, stats.pr.all);
    stats.pr.mergedPercent = getPercent(stats.pr.merged, stats.pr.all);
    stats.pr.closedPercent = getPercent(stats.pr.closed, stats.pr.all);

  }

  function getPercent(part, total, cfd) {

    cfd = cfd || 2;

    var pot = Math.pow(10, cfd);
    var perc = Math.floor(part * 100 * pot / total) / pot;

    return perc;

  }

  function getTimeDifference(ma, mb) {

    if (ma.isValid() === false || mb.isValid() === false) {
      return '--';
    }

    var times = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
    var _times = ['yr', 'mnt', 'wk', 'd', 'h', 'm', 's'];
    var offset = 0;
    var val = 0;

    for (var i = 0, max = times.length; i < max && val == 0; i += 1) {

      val = mb.diff(ma, times[i]);
      offset = i;

    }

    //DEBUG('Diff: ', val, times[offset]);

    var resp = _times[offset];

    return val + ' ' + resp;

  };

  /// Handling refs
  function isReference(str) {

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

  function addReferences(msg) {

    var str = msg.replace(/\r/g, '').replace(/\n/g, ' ');
    var len;

    str = str.split(' ');

    len = str.length;

    for (var i = 0; i < len; i += 1) {
      if (isReference(str[i]) === true) {
        str[i] = parseInt(str[i].substr(1, str[i].length - 1));
        if (references.hasOwnProperty(str[i]) === true) {
          references[str[i]] += 1;
        } else {
          references[str[i]] = 1;
        }
      }
    }

  };

  /// Commits
  function addCommit(commit) {

    var user = commit.commit.author;
    var authorInfo = commit.author;

    var len = users.length;
    var id, i;

    if (authorInfo != null && authorInfo.id && authorInfo.login) {
      id = authorInfo.id;
      user = authorInfo.login;
    } else {
      id = user.email;
      user = user.name;
    }

    for (i = 0; i < len; i += 1) {
      if (users[i].id === id) {
        users[i].name = user;
        users[i].commits += 1;
        return;
      }
    }

    users.push({
      name: user,
      id: id,
      commits: 1,
      pulls: 0,
      issues: 0
    });

  };

  function parseCommits(data) {

    var i, len = data.length;

    for (i = 0; i < len; i += 1) {
      stats.cm += 1;
      data[i].created_at_moment = moment(data[i].commit.author.date);
      data[i].created_at = data[i].created_at_moment.format(DATE_FORMAT);
      data[i].commit.message = data[i].commit.message || '<no-message>';
      addCommit(data[i]);
      addReferences(data[i].commit.message);
      //data[i].message = data[i].message.replace(/\r/g, '').replace(/\n/g, '<br>');
    }

  }

  /// Pull Requests
  function addPullRequest(pr) {

    var len = users.length;

    for (var i = 0; i < len; i += 1) {
      if (users[i].id === pr.user.id) {
        users[i].pulls += 1;
        return;
      }
    }

    users.push({
      name: pr.user.login,
      id: pr.user.id,
      commits: 0,
      pulls: 1,
      issues: 0
    });

  };

  function parsePullRequests(data) {

    var i, len = data.length;

    var model = {
      created_at: moment,
      closed_at: moment,
      merged_at: moment
    };

    for (i = 0; i < len; i += 1) {

      //pullRequests[data[i].number] = moment(data[i].created_at);
      addReferences(data[i].title);
      stats.pr.all += 1;
      stats.pr[data[i].state] += 1;

      data[i].created_at_first = data[i].created_at;

      for (var j in model) {
        if (model.hasOwnProperty(j) === true) {

          data[i][j + '_moment'] = model[j](data[i][j]);

          if (data[i][j]) {
            data[i][j + '_moment'].utcOffset(0);
            data[i][j] = data[i][j + '_moment'].format(DATE_FORMAT);
          } else {
            data[i][j] = '--';
          }
        }
      }

      addPullRequest(data[i]);

      if (data[i].merged_at_moment.isValid() === true) {
        stats.pr.merged += 1;
      }

      data[i].timeToMerge = getTimeDifference(
        data[i].created_at_moment,
        data[i].merged_at_moment
      );

    }

    return data;

  };

  function parseReviews(data) {

    var len = data.length;
    var prLen = pulls.length;
    var i, j, num;

    for (i = 0; i < len; i += 1) {
      if (data[i].length > 0) {
        num = data[i][0].pull_request_url.split('/').pop();
        num = ~~num;
        for (j = 0; j < prLen; j += 1) {
          if (pulls[j].number === num) {
            pulls[j].reviews = data[i];
            break;
          }
        }
      }
    }

  }

  /// Issues
  function addIssue(is) {

    var len = users.length;
    var user = is.user;

    for (var i = 0; i < len; i += 1) {
      if (users[i].id === user.id) {
        users[i].issues += 1;
        return;
      }
    }

    users.push({
      name: user.login,
      id: user.id,
      commits: 0,
      pulls: 0,
      issues: 1
    });

  };

  function updateIssueSteps(issue) {

    var created_at = moment(issue.created_at_moment || null);
    var assigned_at = moment(issue.assigned_at_moment || null);
    var commited_at = moment(issue.commited_at_moment || null);
    var merged_at = moment(issue.merged_at_moment || null);
    var closed_at = moment(issue.closed_at_moment || null);

    var names = ['assigned_at', 'commited_at', 'merged_at', 'closed_at'];
    var dates = [assigned_at, commited_at, merged_at, closed_at];
    var i, j;

    //DEBUG('ISSUE #' + issue.number + ' STEPS: ', created_at, assigned_at, commited_at, closed_at);

    for (i = 0; i < names.length; i += 1) {
      if (dates[i].isValid() === true) {
        issue[names[i]] = getTimeDifference(created_at, dates[i]);
      } else {
        issue[names[i]] = '--';
      }
    }

  };

  function parseIssues(data) {

    var i, len = data.length;

    var model = {
      created_at: moment,
      closed_at: moment
    };

    for (i = 0; i < len; i += 1) {

      addReferences(data[i].title);
      stats.is.all += 1;
      stats.is[data[i].state] += 1;

      data[i].created_at_first = data[i].created_at;

      for (var j in model) {
        if (model.hasOwnProperty(j) === true) {

          data[i][j + '_moment'] = model[j](data[i][j]);

          if (data[i][j]) {
            data[i][j + '_moment'].utcOffset(0);
            data[i][j] = data[i][j + '_moment'].format(DATE_FORMAT);
          } else {
            data[i][j] = '--';
          }
        }
      }

      updateIssueSteps(data[i]);

      addIssue(data[i]);

    }

    //DEBUG('USERS parseIssues: ', users);

    return data;

  };

  /// Events
  function findIssue(number) {

    var ini = 0, fin = issues.length - 1, mid;
    var temp;

    while (ini <= fin) {

      mid = (ini + fin) >> 1;
      temp = issues[mid];

      if (temp.number === number) {
        return temp;
      } else if (temp.number > number) {
        ini = mid + 1;
      } else {
        fin = mid - 1;
      }

    }

    return null;

  };

  function setIssueProperty(prop, event) {

    var issue = findIssue(event.issue.number);

    if (issue === null) {
      return;
    } else {
      if (prop != 'closed_by') {
        
        issue[prop] = moment(event.created_at);
        
        if ( prop === 'commited_at_moment' ) {
          if ( !issue.committers ) {
            issue.committers = [];
          }
          if ( issue.committers.indexOf(event.actor.login) === -1 ) {
            issue.committers.push(event.actor.login);
          }
        }

        updateIssueSteps(issue);
        
      } else {
        if (issue.hasOwnProperty(prop) === false) {
          issue[prop] = event.actor.login;
        }
      }
    }

  };

  function addEvents(events) {

    var len = events.length, i;

    for (i = 0; i < len; i += 1) {
      if (events[i].event === 'referenced') {
        setIssueProperty('commited_at_moment', events[i]);
      } else if (events[i].event === 'assigned') {
        setIssueProperty('assigned_at_moment', events[i]);
      } else if (events[i].event === 'merged') {
        setIssueProperty('merged_at_moment', events[i]);
      } else if (events[i].event === 'closed') {
        setIssueProperty('closed_by', events[i]);
      }
    }

  };

  /// Bundle loaders
  function commitsStats() {

    var file = BASE_DIR + '/commits_bundle.json';

    try {

      commits = require(file);

      try {
        parseCommits(commits);
      } catch(e) {
        console.log('ERROR: ', file);
      }

    } catch (e) {
      console.log('Commits ERROR: ', e);
    }

  }

  function pullsStats() {

    var file = BASE_DIR + '/pr_bundle.json';
    var rev = BASE_DIR + '/reviews_bundle.json';

    try {

      pulls = require(file);
      parsePullRequests(pulls);

    } catch (e) {
      console.log('Pulls ERROR: ', e);
    }

    try {

      var reviews = require(rev);

      parseReviews(reviews);

    } catch (e) {
      console.log('Pulls ERROR: ', e);
    }

  }

  function sort(arr) {

    var len = arr.length;

    if (len < 2) {
      return arr;
    }

    var merge = function merge(__arr, ini, mid, fin) {

      var a = ini, b = mid + 1;
      var res = [];

      while (a <= mid || b <= fin) {
        if (a <= mid && b <= fin) {
          if (__arr[a].number > __arr[b].number) {
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

  }

  function issuesStats() {

    var file = BASE_DIR + '/issues_bundle.json';

    try {

      issues = require(file);

      sort(issues);

      parseIssues(issues);

    } catch (e) {
      console.log('Issues ERROR: ', e);
    }

  }

  function eventsStats() {

    var file = BASE_DIR + '/events_bundle.json';

    try {

      events = require(file);

      addEvents(events);

    } catch (e) {
      console.log('Events ERROR: ', file, '\n', e);
    }

  }

  /// Stats generators
  function genIssuesStats() {

    var res = {
      issues: issues,
      users: users,
      stats: stats,
      references: references
    };

    var file = BASE_DIR + '/issues_stats.json';

    fs.writeFileSync(file, JSON.stringify(res));

    console.log('Saved issues stats');

  }

  function genPullsStats() {

    var res = {
      pulls: pulls,
      users: users,
      stats: stats
    };

    var file = BASE_DIR + '/pulls_stats.json';

    fs.writeFileSync(file, JSON.stringify(res));

    console.log('Saved pulls stats');

  }

  function genCommitsStats() {

    var res = {
      commits: commits,
      users: users,
      stats: stats
    };

    var file = BASE_DIR + '/commits_stats.json';

    fs.writeFileSync(file, JSON.stringify(res));

    console.log('Saved commits stats');

  }

  function genAllStats() {

    var res = {
      commits: commits,
      pullRequests: pulls,
      issues: issues,
      users: users,
      references: references,
      stats: stats,
      events: events
    };

    var file = path.join(BASE_DIR, '/all_stats.json');

    fs.writeFileSync(file, JSON.stringify(res));

    console.log('Saved all stats');

  }

  // var commits              = [];
  // var pulls                = [];
  // var issues               = [];
  // var users                = [];
  // var references           = {};

  commitsStats();
  pullsStats();
  issuesStats();
  eventsStats();

  calcPercents();

  /// Delete all the instances of `moment`
  purge(commits);
  purge(pulls);
  purge(issues);
  purge(users);
  purge(references);

  /// Save stats files
  genIssuesStats();
  genPullsStats();
  genCommitsStats();
  genAllStats();

};

var dirs = require('./repos').dirs;

for (var i = 0; i < dirs.length; i += 1) {
  generate(__dirname + '/' + dirs[i]);
}