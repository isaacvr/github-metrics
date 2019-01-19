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
var auth      = require('./auth');
var mkdirp    = require('mkdirp');

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
var list;
var since;
var MAX_PAGE;
var filedata;
var paramsContainer;

if ( commander.hasOwnProperty('file') === true ) {

  try {
    var filedata = require('./metricsSettings');
    paramsContainer = filedata;
  } catch(e) {
    console.log(chalk.red('Error opening the file'), e);
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
list = paramsContainer.list || [ [ owner, repo] ];
since = paramsContainer.since || '2018-01-01T00:00:00Z';
MAX_PAGE = paramsContainer.maxPage || 30;

/// Constants
const ISSUES_TMPL   = 'http://api.github.com/repos/:owner/:repo/issues?state=all&page=:page&per_page=100&since=' + since;
const EVENTS_TMPL   = 'http://api.github.com/repos/:owner/:repo/issues/events?state=all&page=:page&per_page=100&since=' + since;
const PULL_REQ_TMPL = 'http://api.github.com/repos/:owner/:repo/pulls?state=all&page=:page&per_page=100&since=' + since;
const COMMITS_TMPL  = 'http://api.github.com/repos/:owner/:repo/commits?state=all&page=:page&per_page=100&since=' + since;
const REVIEWS_TMPL  = 'http://api.github.com/repos/:owner/:repo/pulls/:number/reviews';

function genMetrics(_owner, _repo) {
  var issues   = ISSUES_TMPL.replace(':owner', _owner).replace(':repo', _repo);
  var events   = EVENTS_TMPL.replace(':owner', _owner).replace(':repo', _repo);
  var pullReq  = PULL_REQ_TMPL.replace(':owner', _owner).replace(':repo', _repo);
  var commits  = COMMITS_TMPL.replace(':owner', _owner).replace(':repo', _repo);
  var reviews  = REVIEWS_TMPL.replace(':owner', _owner).replace(':repo', _repo);

  function getSingleReview(n) {

    n = n.toString();

    var url = reviews.replace(':number', n);

    if ( fs.existsSync(path.join(__dirname, 'json_' + _owner + '_' + _repo, 'review-' + n + '.json')) === true ) {
      return;
    }

    request({
      method: 'GET',
      url: url,
      headers: {
        'Accept': 'application/vnd.github.cloak-preview',
        'User-Agent': 'request'
      }
    }, function(err, res, body) {

      if ( err ) {
        console.log(chalk.red(err.message));
        return;
      }

      mkdirp.sync(path.join(__dirname, 'json_' + _owner + '_' + _repo));

      var fileName = path.join(__dirname, 'json_' + _owner + '_' + _repo, 'review-' + n + '.json');

      fs.writeFile(fileName, body, function(err1) {
        if ( err1 ) {
          console.log(chalk.red('Error trying to save file: ' + fileName));
          return;
        }
        console.log(chalk.green('Successfully downloaded reviews for pull #' + n));
      });

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

    request({
      method: 'GET',
      url: url,
      headers: {
        'Accept': accept,
        'User-Agent': 'request'
      }
    }, function(err, res, body) {

      if ( err ) {
        console.log(chalk.red(descriptor + ' error: ' + err.message));
        return;
      }

      mkdirp.sync(path.join(__dirname, 'json_' + _owner + '_' + _repo));

      setTimeout(function() {
        cb(body, url, descriptor, file);
      }, 0);

      var fileName = path.join(__dirname, 'json_' + _owner + '_' + _repo, file + Date.now() + '.json')      

      fs.writeFile(fileName, body, function(err1) {
        if ( err1 ) {
          console.log(chalk.red('Error trying to save file: ' + fileName));
          return;
        }
        console.log(chalk.green('Successfully downloaded ' + descriptor + ' from ' + _owner + '/' + _repo));
      });

    });

  }

  function getNextPage(data, url, descriptor, file) {

    var obj = JSON.parse(data);

    if ( Array.isArray(obj) === true ) {
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
    } else {
      console.log('EMPTY OBJECT: ', url);
    }

  }

  getInfo(events, 'Issue Events', 'events', '', getNextPage);
  getInfo(issues, 'Issues', 'issues', '', getNextPage);
  getInfo(pullReq, 'Pull Requests', 'pr', '', function(data) {
    getReviews(data);
    // console.log(data);
    getNextPage.apply(null, arguments);
  });
  getInfo(commits, 'Commits', 'commits', '', getNextPage);

}

var itv = setInterval(function() {

  if ( list.length === 0 ) {
    clearInterval(itv);
    return;
  }

  genMetrics( list[0][0], list[0][1] );
  
  list.shift();

}, 5000);


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
