/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var fs        = require('fs');
var path      = require('path');
var request   = require('request');
var chalk     = require('chalk');
var commander = require('commander');
var qstring   = require('querystring');
var moment    = require('moment');
var auth      = require('./auth');

var authHeader = '';

if ( auth.client_id !== -1 && auth.client_secret !== -1 ) {
  authHeader = 'client_id=' + auth.client_id + '&client_secret=' + auth.client_secret;
}

commander
  .option('-o, --owner [owner]', 'Specify the owner of the repository')
  .option('-r, --repo [repo]', 'Specify the name of the repository')
  .option('-p, --proxy [proxy]', 'Connect through proxy http://user:pass@host:port')
  .option('-f, --file', 'Get the basic data from a file')
  .parse(process.argv);

var owner;
var repo;
var since;
var MAX_PAGE;
var filedata;
var paramsContainer;

if ( commander.hasOwnProperty('file') === true ) {

  try {
    var filedata = require('./metricsSettings');
    paramsContainer = filedata;
  } catch(e) {
    console.log(chalk.red('Error opening the file'));
    process.exit(0);
  }

} else {
  paramsContainer = commander;
}

if ( paramsContainer.hasOwnProperty('owner') === false ) {
  console.log(chalk.red('Missing parameter "owner"'));
  process.exit(0);
}

if ( paramsContainer.hasOwnProperty('repo') === false ) {
  console.log(chalk.red('Missing parameter "repo"'));
  process.exit(0);
}

if ( paramsContainer.hasOwnProperty('proxy') === true ) {
  request = request.defaults({
    proxy: paramsContainer.proxy
  });
}

owner = paramsContainer.owner;
repo  = paramsContainer.repo;
since = paramsContainer.since || '2018-01-01T00:00:00Z';
MAX_PAGE = paramsContainer.maxPage || 30;

/// Constants
var ISSUES_TMPL   = 'http://api.github.com/repos/:owner/:repo/issues?state=all&page=:page&per_page=100&since=' + since;
var EVENTS_TMPL   = 'http://api.github.com/repos/:owner/:repo/issues/events?state=all&page=:page&per_page=100&since=' + since;
var PULL_REQ_TMPL = 'http://api.github.com/repos/:owner/:repo/pulls?state=all&page=:page&per_page=100&since=' + since;
var COMMITS_TMPL  = 'http://api.github.com/repos/:owner/:repo/commits?state=all&page=:page&per_page=100&since=' + since;
var REVIEWS_TMPL  = 'http://api.github.com/repos/:owner/:repo/pulls/:number/reviews';
var CONTRIB_TMPL  = 'http://api.github.com/repos/:owner/:repo/stats/contributors';
var ACTIVITY_TMPL = 'http://api.github.com/repos/:owner/:repo/stats/commit_activity';
var PARTICIP_TMPL = 'http://api.github.com/repos/:owner/:repo/stats/participation';
var COMM_PH_TMPL  = 'http://api.github.com/repos/:owner/:repo/stats/punch_card';

var issues   = ISSUES_TMPL.replace(':owner', owner).replace(':repo', repo);
var events   = EVENTS_TMPL.replace(':owner', owner).replace(':repo', repo);
var pullReq  = PULL_REQ_TMPL.replace(':owner', owner).replace(':repo', repo);
var commits  = COMMITS_TMPL.replace(':owner', owner).replace(':repo', repo);
var reviews  = REVIEWS_TMPL.replace(':owner', owner).replace(':repo', repo);
var contrib  = CONTRIB_TMPL.replace(':owner', owner).replace(':repo', repo);
var activity = ACTIVITY_TMPL.replace(':owner', owner).replace(':repo', repo);
var particip = PARTICIP_TMPL.replace(':owner', owner).replace(':repo', repo);
var commph   = COMM_PH_TMPL.replace(':owner', owner).replace(':repo', repo);

function getSingleReview(n) {

  n = n.toString();

  var url = reviews.replace(':number', n);

  if ( fs.exists(path.join(__dirname, 'json', 'review-' + n + '.json')) === true ) {
    return;
  }

  request
    .get({
      url: url,
      headers: {
        'Accept': 'application/vnd.github.cloak-preview',
        'User-Agent': 'request'
      }
    })
    .on('error', function(err) {
      console.log(chalk.red(err.message));
    })
    .on('response', function(res) {
      var data = '';
      res.on('data', function(d) {
        data += d;
      });
      res.on('end', function() {
        var cant = JSON.parse(data).length;
        var res = n + ':' + cant + '\n';
        fs.appendFileSync(path.join(__dirname, 'json', '_prReviews.json'), res);
        console.log(chalk.green('Successfully downloaded reviews for pull #' + n));
      });
      res.pipe( fs.createWriteStream( path.join(__dirname, 'json', 'review-' + n + '.json') ) );
    });

}

function getReviews(data) {

  var obj = JSON.parse(data);

  //console.log(obj);

  var len = obj.length;

  for (var i = 0; i < len; i += 1) {

    //console.log(obj[i].number);
    getSingleReview(obj[i].number);

  }

}

function getInfo(url, descriptor, file, number, callback, accept) {

  number = number || '';
  var realNumber = Math.max(1, ~~number);

  if ( realNumber > MAX_PAGE ) {
    return;
  }

  console.log(chalk.blue('Fetching ' + descriptor + '...'));

  accept = accept || 'application/vnd.github.cloak-preview';

  var cb;

  url = url.replace(':page', realNumber);

  console.log(chalk.green(url));

  if ( typeof callback === 'function' ) {
    cb = callback;
  } else {
    cb = () => {};
  }

  if ( url.indexOf('client_id') === -1 ) {
    if ( url.indexOf('?') === -1 ) {
      url = url + '?' + authHeader;
    } else {
      url = url + '&' + authHeader;
    }
  }

  request
    .get({
      url: url,
      headers: {
        'Accept': accept,
        'User-Agent': 'request'
      }
    })
    .on('error', function(err) {
      console.log(chalk.red(descriptor + ' error: ' + err.message));
    })
    .on('response', function(res) {

      var data = '';

      res.on('data', function(d) {
        data += d;
      });

      res.on('end', function() {
        setTimeout(function() {

          cb(data, url, descriptor, file);

        }, 0);

        console.log(chalk.green('Successfully downloaded ' + descriptor + ' from ' + owner + '/' + repo));

      });
      res.pipe( fs.createWriteStream( path.join(__dirname, 'json', file + Date.now() + '.json') ) );
    });

}

function getNextPage(data, url, descriptor, file) {

  var obj = JSON.parse(data);

  var idx = url.indexOf('?');
  var query = url.substr(idx + 1, url.length);
  var base = url.substr(0, idx);

  var queryObj = qstring.decode(query);

  //console.log(queryObj);

  if ( obj.length > 0 ) {
    if ( !!queryObj.page === true ) {
      queryObj.page = (~~queryObj.page + 1).toString();
      getInfo(base + '?' + qstring.encode(queryObj), descriptor, file, queryObj.page, getNextPage);
    }
  } else {
    console.log('EMPTY OBJECT: ', url);
  }

}

//getInfo(contrib, 'Contributions', 'contribs');
//getInfo(activity, 'Commit Activity', 'commit_activity');
//getInfo(particip, 'Participation', 'participation');
//getInfo(commph, 'Commits per hour', 'punch_card');
getInfo(events, 'Issue Events', 'events', '', getNextPage);
getInfo(issues, 'Issues', 'issues', '', getNextPage);
getInfo(pullReq, 'Pull Requests', 'pr', '', function(data) {
  getReviews(data);
  // console.log(data);
  getNextPage.apply(null, arguments);
});
getInfo(commits, 'Commits', 'commits', '', getNextPage);

/*

  -------------------------------------------------------------------------
                              ** Issues **
  {
    state: String,
    title: String,
    created_at: Date || null,
    closed_at: Date || null,
    comments: Number
  }

  -------------------------------------------------------------------------
                              ** Pull Request **

  {
    state: String,
    title: String,
    created_at: Date || null,
    closed_at: Date || null,
    merged_at: Date || null
  }

  -------------------------------------------------------------------------
                              ** Commits **

  {
    commit: {
      author: {

      }
    }
  }

  https://help.github.com/articles/searching-commits/
  https://help.github.com/articles/search-syntax/



//*/
