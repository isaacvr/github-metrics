/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var fs        = require('fs');
var path      = require('path');
var request   = require('request');
var chalk     = require('chalk');
var commander = require('commander');

commander
  .option('-o, --owner [owner]', 'Specify the owner of the repository')
  .option('-r, --repo [repo]', 'Specify the name of the repository')
  .option('-p, --proxy [proxy]', 'Connect through proxy http://user:pass@host:port')
  .parse(process.argv);

//console.log(commander);

if ( commander.hasOwnProperty('owner') === false ) {
  console.log(chalk.red('Missing parameter "owner"'));
  process.exit(0);
}

if ( commander.hasOwnProperty('repo') === false ) {
  console.log(chalk.red('Missing parameter "repo"'));
  process.exit(0);
}

if ( commander.hasOwnProperty('proxy') === true ) {
  request = request.defaults({
    proxy: commander.proxy
  });
}

var owner = commander.owner;
var repo  = commander.repo;

/// Constants
var ISSUES_TMPL   = 'http://api.github.com/repos/:owner/:repo/issues';
var PULL_REQ_TMPL = 'http://api.github.com/repos/:owner/:repo/pulls?state=all';
var COMMITS_TMPL  = 'http://api.github.com/repos/:owner/:repo/commits';
var REVIEWS_TMPL  = 'http://api.github.com/repos/:owner/:repo/pulls/:number/reviews';
var CONTRIB_TMPL  = 'http://api.github.com/repos/:owner/:repo/stats/contributors';
var ACTIVITY_TMPL = 'http://api.github.com/repos/:owner/:repo/stats/commit_activity';
var PARTICIP_TMPL = 'http://api.github.com/repos/:owner/:repo/stats/participation';
var COMM_PH_TMPL  = 'http://api.github.com/repos/:owner/:repo/stats/punch_card';

var issues   = ISSUES_TMPL.replace(':owner', owner).replace(':repo', repo);
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
      res.on('end', function() {
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

function getInfo(url, descriptor, file, callback, accept) {

  console.log(chalk.blue('Fetching ' + descriptor + '...'));

  accept = accept || 'application/vnd.github.cloak-preview';

  var cb;

  if ( typeof callback === 'function' ) {
    cb = callback;
  } else {
    cb = () => {};
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

          cb(data);

        }, 0);

        console.log(chalk.green('Successfully downloaded ' + descriptor + ' from ' + owner + '/' + repo));

      });
      res.pipe( fs.createWriteStream( path.join(__dirname, 'json', file + '.json') ) );
    });

}

getInfo(issues, 'Issues', 'issues');
getInfo(pullReq, 'Pull Requests', 'pr', getReviews);
getInfo(commits, 'Commits', 'commits');
getInfo(contrib, 'Contributions', 'contribs');
getInfo(activity, 'Commit Activiry', 'commit_activity');
getInfo(particip, 'Participation', 'participation');
getInfo(commph, 'Commits per hour', 'punch_card');

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
