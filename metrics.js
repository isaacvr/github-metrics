/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var fs               = require('fs');
var path             = require('path');
var { EventEmitter } = require('events');
var URL              = require('url').URL;
var request          = require('request');
var chalk            = require('chalk');
var commander        = require('commander');
var auth             = require('./auth');
var mkdirp           = require('mkdirp');

var control = new EventEmitter();
var MAX_QUEUE_SIZE = 5;
var queue = [];
var current = 0;

commander
  .option('-o, --owner [owner]', 'Specify the owner of the repository')
  .option('-r, --repo [repo]', 'Specify the name of the repository')
  .option('-p, --proxy [proxy]', 'Connect through proxy http://user:pass@host:port')
  .option('-f, --file', 'Get the basic data from a file')
  .parse(process.argv);

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

list = paramsContainer.list || [ [ paramsContainer.owner, paramsContainer.repo] ];
since = paramsContainer.since || '2018-01-01T00:00:00Z';
MAX_PAGE = paramsContainer.maxPage || 30;

var visited = new Map();

function setParams(url, params) {

  var localUrl;

  if ( !(url instanceof URL) ) {
    localUrl = new URL(url);
  } else {
    localUrl = new URL(url.toString());
  }

  for (var i = 0; i < params.length; i += 1) {
    localUrl.searchParams.set(params[i][0], params[i][1]);
  }
  
  return localUrl.toString();

}

function getUrlFor(type, options) {

  const TEMPLATES = {
    branches: 'http://api.github.com/repos/:owner/:repo/branches',
    issues: 'http://api.github.com/repos/:owner/:repo/issues',
    events: 'http://api.github.com/repos/:owner/:repo/issues/events',
    pulls: 'http://api.github.com/repos/:owner/:repo/pulls',
    commits: 'http://api.github.com/repos/:owner/:repo/commits',
    reviews: 'http://api.github.com/repos/:owner/:repo/pulls/:number/reviews'
  };

  if ( TEMPLATES.hasOwnProperty(type) === false ) {
    return null;
  }

  options.params = options.params || [];

  console.log('GET URL:  ', type, options);

  var urlObj = TEMPLATES[type]
                .replace(':owner', options.owner)
                .replace(':repo', options.repo);
   
  if (type === 'reviews') {
    urlObj = urlObj.replace(':number', options.number);
  }

  urlObj = new URL(urlObj);

  if ( [ 'branches', 'reviews' ].indexOf(type) === -1 ) {
    urlObj.searchParams.set('state', 'all');
    urlObj.searchParams.set('per_page', '100');
    urlObj.searchParams.set('since', since);
  }

  if ( auth.client_id !== -1 && auth.client_secret !== -1 ) {
    urlObj.searchParams.set('client_id', auth.client_id);
    urlObj.searchParams.set('client_secret', auth.client_secret);
  }

  return setParams(urlObj, options.params);

};

function getRandomId() {
  return Math.random().toString().split('.')[1];
}

async function getInfo(owner, repo, url, descriptor, file, number, callback, id /*, accept */) {

  number = number || '';
  var realNumber = Math.max(1, ~~number);

  if ( realNumber > MAX_PAGE ) {
    control.emit('taskEnd', id);
    return;
  }

  var args = arguments;

  console.log(chalk.blue('Fetching ' + descriptor + '...'));

  //accept = accept || 'application/vnd.github.cloak-preview';
  var accept = 'application/vnd.github.cloak-preview';

  var cb;

  url = setParams(url, [ ['page', realNumber] ]);

  console.log(chalk.green(url));

  if ( typeof callback === 'function' ) {
    cb = callback;
  } else {
    cb = () => {};
  }

  // if ( url.indexOf('client_id') === -1 ) {
  //   if ( url.indexOf('?') === -1 ) {
  //     url = url + '?' + authHeader;
  //   } else {
  //     url = url + '&' + authHeader;
  //   }
  // }

  if ( visited.has(url) === true ) {
    control.emit('taskEnd', id);
    return;
  }

  visited.set(url, true);

  request({
    method: 'GET',
    url: url,
    headers: {
      'Accept': accept,
      'User-Agent': 'request'
    }
  }, function(err, res, body) {

    if ( err ) {
      visited.delete(url);
      console.log(chalk.red(descriptor + ' error: ' + err.message + '  --  ' + url));
      //control.emit('addTask', getRandomId(), Object.keys(args).map(function(_e) { return args[_e] }) );
      control.emit('taskEnd', id);
      return;
    }

    control.emit('taskEnd', id);

    setTimeout(function() {
      cb(owner, repo, body, url, descriptor, file);
    }, 0);
    
    if ( file != null ) {
      mkdirp.sync(path.join(__dirname, 'json_' + owner + '_' + repo));

      var fileName = path.join(__dirname, 'json_' + owner + '_' + repo, file + Date.now() + '.json');

      fs.writeFile(fileName, body, function(err1) {
        if ( err1 ) {
          console.log(chalk.red('Error trying to save file: ' + fileName));
          return;
        }
        console.log(chalk.green('Successfully downloaded ' + descriptor + ' from ' + owner + '/' + repo));
      });
    }

  });

}

var getNextPage = function getNextPage(owner, repo, data, url, descriptor, file) {

  try {
    var obj = JSON.parse(data);

    if ( Array.isArray(obj) === true ) {
      var urlObj = new URL(url);

      //console.log(queryObj);

      if ( obj.length > 0 ) {
        if ( urlObj.searchParams.has('page') === true ) {
          var newPage = ~~urlObj.searchParams.get('page') + 1;
          control.emit('addTask', getRandomId(), [ owner, repo, setParams(urlObj, [['page', newPage]]), descriptor, file, newPage, getNextPage ]);
        }
      } else {
        console.log('EMPTY OBJECT: ', url);
      }
    } else {
      console.log('EMPTY OBJECT: ', url);
    }

  } catch(e) {
    console.log('ERROR in file: ', url);
  }

}

function genMetrics(_owner, _repo) {

  var getSingleReview = function getSingleReview(n) {

    n = n.toString();

    var url = getUrlFor('reviews', {
      owner: _owner,
      repo: _repo,
      number: n
    });

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

  var getReviews = function getReviews(data) {

    try {
      var obj = JSON.parse(data);

      //console.log(obj);

      var len = obj.length;

      for (var i = 0; i < len; i += 1) {

        //console.log(obj[i].number);
        getSingleReview(obj[i].number);

      }

    } catch(e) {
      console.log('ERROR: ', e.message);
    }

  }

  var branches = getUrlFor('branches', {
    owner: _owner,
    repo: _repo
  });

  control.emit('addTask', getRandomId(), [ _owner, _repo, branches, 'Branches', null, '', function(owner, repo, branchList) {
    branchList = JSON.parse(branchList);

    var repoInfo = {
      owner: owner,
      repo: repo
    };

    console.log(owner, '/', repo, branchList);

    var events = getUrlFor('events', repoInfo);
    var issues = getUrlFor('issues', repoInfo);
    var pullReq = getUrlFor('pulls', repoInfo);
    var commits = getUrlFor('commits', repoInfo);

    control.emit('addTask', getRandomId(), [ owner, repo, events, 'Issue Events', 'events', '', getNextPage ]);
    control.emit('addTask', getRandomId(), [ owner, repo, issues, 'Issues', 'issues', '', getNextPage ]);
    control.emit('addTask', getRandomId(), [ owner, repo, pullReq, 'Pull Requests', 'pr', '', function(owner, repo, data) {
      var args = arguments;
      getReviews(data);
      getNextPage.apply(null, Object.keys(args).map(e => args[e]) );
    } ]);

    for (var i = 0; i < branchList.length; i += 1) {
      commits = setParams(commits, [['sha', branchList[i].commit.sha]]);
      console.log('\n\n', branchList[i].name, '    ', branchList[i].commit.sha, '\n');
      control.emit('addTask', getRandomId(), [ owner, repo, commits, 'Commits', 'commits', '', getNextPage ]);
    }//*/
  } ]);

}

control.on('addTask', function(id, params) {
  
  console.log('ADD TASK ', id);

  queue.push({
    params: params,
    id: id
  });

  if ( current <= MAX_QUEUE_SIZE ) {
    current += 1;
    console.log('Current ', current);
    setTimeout(function() {
      getInfo.apply(null, params.concat(id));
    }, 10);
  }
});

control.on('taskEnd', function(taskId) {

  console.log('END TASK ', taskId);

  current -= 1;

  if ( current < 0 ) {
    current = 0;
  }

  var i;

  for (i = queue.length - 1; i >= 0; i -= 1) {
    if ( queue[i].id === taskId ) {
      queue.splice(i, 1);
      break;
    }
  }

  console.log('Current ', current, 'of', queue.length);

  if ( current === 0 ) {
    for (i = 0; i < MAX_QUEUE_SIZE && i < queue.length; i += 1) {
      console.log('TASK  ===>>   ', queue[i].params);
      if ( queue[i] ) {
        getInfo.apply(null, queue[i].params.concat(queue[i].id));
      }
    }
  }

});

for (var i = 0; i < list.length; i += 1) {
  genMetrics(list[i][0], list[i][1]);
}//*/

/*var itv = setInterval(function() {

  if ( list.length === 0 ) {
    clearInterval(itv);
    return;
  }

  genMetrics( list[0][0], list[0][1] );
  
  list.shift();

}, 10);//*/