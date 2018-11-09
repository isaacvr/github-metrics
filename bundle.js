/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var glob = require('glob');
var fs = require('fs');

var TIMEOUT = 10;

glob(__dirname + '/json/commits/*.json', function(err, data) {
  var i = 0, max = data.length;
  var res = '';

  var itv = setInterval(function() {
    if ( i === max ) {
      clearInterval(itv);
      res = '[' + res + ']';
      fs.writeFileSync(__dirname + '/json/commits_bundle.json', res);
      return;
    }
    console.log(i);
    res += fs.readFileSync(data[i++], 'utf8');
  }, TIMEOUT);
});
/*
glob(__dirname + '/json/events/*.json', function(err, data) {
  var i = 0, max = data.length;

  var itv = setInterval(function() {
    if ( i === max ) {
      clearInterval(itv);
      return;
    }
    simplifyEvents(data[i++]);
  }, TIMEOUT);
});

glob(__dirname + '/json/issues/*.json', function(err, data) {
  var i = 0, max = data.length;
  var itv = setInterval(function() {
    if ( i === max ) {
      clearInterval(itv);
      return;
    }
    simplifyIssues(data[i++]);
  }, TIMEOUT);
});

glob(__dirname + '/json/reviews/*.json', function(err, data) {
  var i = 0, max = data.length;
  var itv = setInterval(function() {
    if ( i === max ) {
      clearInterval(itv);
      return;
    }
    simplifyReviews(data[i++]);
  }, TIMEOUT);
});

glob(__dirname + '/json/pulls/*.json', function(err, data) {
  var i = 0, max = data.length;
  var itv = setInterval(function() {
    if ( i === max ) {
      clearInterval(itv);
      return;
    }
    simplifyPullRequest(data[i++]);
  }, TIMEOUT);
});//*/