(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
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
},{"minimatch":7,"olap-cube":10}],4:[function(require,module,exports){
'use strict';
module.exports = balanced;
function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);

  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}

},{}],5:[function(require,module,exports){
var concatMap = require('concat-map');
var balanced = require('balanced-match');

module.exports = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balanced('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function identity(e) {
  return e;
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balanced('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(',') >= 0;
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length)
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}


},{"balanced-match":4,"concat-map":6}],6:[function(require,module,exports){
module.exports = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],7:[function(require,module,exports){
module.exports = minimatch
minimatch.Minimatch = Minimatch

var path = { sep: '/' }
try {
  path = require('path')
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
var expand = require('brace-expansion')

var plTypes = {
  '!': { open: '(?:(?!(?:', close: '))[^/]*?)'},
  '?': { open: '(?:', close: ')?' },
  '+': { open: '(?:', close: ')+' },
  '*': { open: '(?:', close: ')*' },
  '@': { open: '(?:', close: ')' }
}

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]'

// * => any number of characters
var star = qmark + '*?'

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!')

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/')
  }

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function () {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
  var negate = false
  var options = this.options
  var negateOffset = 0

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate
    negateOffset++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
}

Minimatch.prototype.braceExpand = braceExpand

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options
    } else {
      options = {}
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern

  if (typeof pattern === 'undefined') {
    throw new TypeError('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return expand(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  if (pattern.length > 1024 * 64) {
    throw new TypeError('pattern is too long')
  }

  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = ''
  var hasMagic = !!options.nocase
  var escaping = false
  // ? => one single character
  var patternListStack = []
  var negativeLists = []
  var stateChar
  var inClass = false
  var reClassStart = -1
  var classStart = -1
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)'
  var self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star
          hasMagic = true
        break
        case '?':
          re += qmark
          hasMagic = true
        break
        default:
          re += '\\' + stateChar
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c
      escaping = false
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar()
        escaping = true
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === '!' && i === classStart + 1) c = '^'
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
      continue

      case '(':
        if (inClass) {
          re += '('
          continue
        }

        if (!stateChar) {
          re += '\\('
          continue
        }

        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)'
          continue
        }

        clearStateChar()
        hasMagic = true
        var pl = patternListStack.pop()
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        re += pl.close
        if (pl.type === '!') {
          negativeLists.push(pl)
        }
        pl.reEnd = re.length
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|'
          escaping = false
          continue
        }

        clearStateChar()
        re += '|'
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += '\\' + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c
          escaping = false
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i)
          try {
            RegExp('[' + cs + ']')
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE)
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
            hasMagic = hasMagic || sp[1]
            inClass = false
            continue
          }
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\'
        }

        re += c

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1)
    sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + '\\[' + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length)
    this.debug('setting tail', re, pl)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\'
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    })

    this.debug('tail=%j\n   %s', tail, tail, pl, re)
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart) + t + '\\(' + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += '\\\\'
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n]

    var nlBefore = re.slice(0, nl.reStart)
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
    var nlAfter = re.slice(nl.reEnd)

    nlLast += nlAfter

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1
    var cleanAfter = nlAfter
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
    }
    nlAfter = cleanAfter

    var dollar = ''
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$'
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
    re = newRe
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re
  }

  if (addPatternStart) {
    re = patternStart + re
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : ''
  try {
    var regExp = new RegExp('^' + re + '$', flags)
  } catch (er) {
    // If it was an invalid regular expression, then it can't match
    // anything.  This trick looks for a character after the end of
    // the string, which is of course impossible, except in multi-line
    // mode, but it's not a /m regex.
    return new RegExp('$.')
  }

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) {
    this.regexp = false
    return this.regexp
  }
  var options = this.options

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot
  var flags = options.nocase ? 'i' : ''

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|')

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$'

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$'

  try {
    this.regexp = new RegExp(re, flags)
  } catch (ex) {
    this.regexp = false
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug('match', f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/')
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, 'split', f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, 'set', set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename
  var i
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i]
    var file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern })

  this.debug('matchOne', file.length, pattern.length)

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop')
    var p = pattern[pi]
    var f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
      var pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr)
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr++
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug('string match', p, f, hit)
    } else {
      hit = f.match(p)
      this.debug('pattern match', p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
}

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

},{"brace-expansion":5,"path":1}],8:[function(require,module,exports){
module.exports=function(x){return x==null||(typeof x == 'number'&&isNaN(x))||(x.length<1&&typeof x!='function')||(typeof x=='object'&&Object.keys(x).length<1)}

},{}],9:[function(require,module,exports){
const no = require('not-defined')
const staticProps = require('static-props')

/**
 * OLAP table, a.k.a. cube of data.
 *
 * An OLAP cube table is a multidimensional array of data.
 * It extends an ordinary table by adding dimensions that are
 * nothing more than special fields. If in a flat database table
 * you find many cell values repeating, for example
 *
 * year | month | revenue
 * 2016 | Gen   | 100
 * 2016 | Feb   | 170
 * ...
 *
 * probably it is a dimension and you don't need to repeat it on
 * each row.
 *
 * @class
 */

class Table {
  /**
   * Create an OLAP table.
   *
   * ```
   * var table = new Table({
   *   dimensions: [ 'year', 'month' ],
   *   points: [ [2016, 'Gen'], [2016, 'Feb'], [2016, 'Mar'] ],
   *   fields: ['revenue'],
   *   data: [[100], [170], [280]]
   * })
   * ```
   *
   * @param {Object} arg
   * @param {Array} arg.dimensions
   * @param {Array} arg.points
   * @param {Array} arg.fields
   * @param {Array} arg.data in the format data[pointIndex][fieldIndex]
   */
  constructor () {
    // Assign default arguments.

    const arg = Object.assign({
      dimensions: [],
      points: [],
      fields: [],
      data: []
    }, arguments[0])

    const dimensions = arg.dimensions
    const points = arg.points
    const fields = arg.fields
    const data = arg.data

    // Check arguments are consistent with multidim table structure.

    const tableHasData = data.length > 0

    if (tableHasData) {
      const invalidSlices = data.filter((slice) => slice.length !== fields.length)

      if (invalidSlices.length > 0) {
        throw new TypeError('invalid slices')
      }

      const invalidPoints = points.filter((p) => p.length !== dimensions.length)
      if (invalidPoints.length > 0) {
        throw new TypeError('invalid points')
      }

      if (data.length !== points.length) {
        throw new TypeError('orphan slices')
      }
    }

    // Set immutable attributes.

    const enumerable = true
    staticProps(this)({ dimensions, fields }, enumerable)

    staticProps(this)({
      points,
      data,
      structure: { dimensions, fields }
    })

    // Derived fields.

    staticProps(this)({
      header: () => this.dimensions.concat(this.fields),
      rows: () => this.points.map((p, i) => p.concat(this.data[i]))
    })
  }

  /**
   * Add a set of rows to the table.
   *
   * table.addRows({
   *   header: ['year', 'month', 'revenue'],
   *   rows: [
   *     [ 2016, 'Gen', 100 ],
   *     [ 2016, 'Feb', 170 ],
   *     [ 2016, 'Mar', 280 ]
   *   ]
   * })
   *
   * @param {Object} data
   * @param {Array} data.header
   * @param {Array} data.rows
   * @returns {Object} table
   */

  addRows (arg) {
    const header = arg.header
    const rows = arg.rows

    const dimensions = this.dimensions
    const fields = this.fields

    if (header.length !== (dimensions.length + fields.length)) {
      throw new TypeError('invalid header')
    }

    const data = [...this.data]
    const points = [...this.points]

    rows.forEach((row) => {
      let point = []
      let cells = []

      for (let i in row) {
        const key = header[i]
        let dimIndex = dimensions.indexOf(key)
        let fieldIndex = fields.indexOf(key)

        if (dimIndex > -1) {
          point.splice(dimIndex, 0, row[i])
        } else if (fieldIndex > -1) {
          cells.splice(fieldIndex, 0, row[i])
        } else {
          throw new TypeError('invalid row')
        }
      }

      let pointIndex = null
      points.forEach((p, index) => {
        if (p.filter((coord, i) => coord === point[i]).length === point.length) {
          // Found point.
          pointIndex = index
        }
      })

      if (pointIndex === null) {
        // No point was found, let's add it.
        pointIndex = points.length
        points.push(point)
      }

      data.splice(pointIndex, 0, cells)
    })

    return new Table(
      Object.assign({}, this.structure, { points, data })
    )
  }

  /**
   * Slice operator picks a rectangular subset of a cube by choosing a single value of its dimensions.
   *
   * @param {String} dimension
   * @param {*} filter
   * @returns {Object} table
   */

  slice (dimension, filter) {
    const structure = this.structure
    let points = []
    let data = []

    const dimensionIndex = structure.dimensions.indexOf(dimension)

    if (dimensionIndex === -1) {
      throw new TypeError('dimension not found', dimension)
    }

    this.points.forEach((point, i) => {
      // Add slice if it matches given filter.
      if (point[dimensionIndex] === filter) {
        data.push(this.data[i])
        points.push(this.points[i])
      }
    })

    return new Table(
      Object.assign({}, structure, { points, data })
    )
  }

  /**
   * Dice operator picks a subcube by choosing a specific values of multiple dimensions.
   *
   * @param {Function} selector
   * @returns {Object} table
   */

  dice (selector) {
    let points = []
    let data = []

    this.points.forEach((point, i) => {
      if (selector(point)) {
        data.push(this.data[i])
        points.push(this.points[i])
      }
    })

    return new Table(
      Object.assign({}, this.structure, { points, data })
    )
  }

  /**
   * A roll-up involves summarizing the data along a dimension.
   *
   * @param {String} dimension
   * @param {Array} fields
   * @param {Function} aggregator
   * @param {*} initialValue
   * @returns {Object} table
   */

  rollup (dimension, fields, aggregator, initialValue) {
    let points = []
    let dataObj = {}
    let rolledupData = []
    let seen = {}

    const dimensionIndex = this.structure.dimensions.indexOf(dimension)
    const numDimensions = this.structure.dimensions.length

    const structure = {
      dimensions: [dimension],
      fields
    }

    this.rows.forEach(row => {
      // Compute points that is an array of array of strings.
      const point = row[dimensionIndex]

      if (!seen[point]) {
        points.push([point])
        seen[point] = true
      }

      const fields = row.slice(numDimensions)

      if (no(dataObj[point])) dataObj[point] = []

      dataObj[point].push(fields)
    })

    points.forEach(point => {
      rolledupData.push(dataObj[point].reduce(aggregator, initialValue))
    })

    return new Table(
      Object.assign({}, structure, { points, data: rolledupData })
    )
  }
}

module.exports = Table

},{"not-defined":8,"static-props":11}],10:[function(require,module,exports){
require('strict-mode')(function () {
  module.exports = {
    model: {
      Table: require('./model/Table')
    }
  }
})

},{"./model/Table":9,"strict-mode":12}],11:[function(require,module,exports){
/**
 * @param {Object} obj
 * @returns {Function}
 */
function staticProps (obj) {
  /**
   * @param {Object} props
   * @param {Boolean} [enumerable]
   */
  return function (props, enumerable) {
    var staticProps = {}

    for (var propName in props) {
      var staticProp = {
        configurable: false,
        enumerable: enumerable
      }

      var prop = props[propName]

      if (typeof prop === 'function') {
        staticProp.get = prop
      } else {
        staticProp.value = prop

        staticProp.writable = false
      }

      staticProps[propName] = staticProp
    }

    Object.defineProperties(obj, staticProps)
  }
}
module.exports = exports.default = staticProps

},{}],12:[function(require,module,exports){
// In browserify context, fall back to a no op.
module.exports = function (cb) { cb() }

},{}]},{},[3]);
