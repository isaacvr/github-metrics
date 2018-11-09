/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var glob = require('glob');
var fs = require('fs');

var baseDir = __dirname + '/json/';

function getFileName(dir) {

  var name = dir.split('/').pop();

  return name;

}

function decomposePullRequest(file) {

  var data = JSON.parse(fs.readFileSync(file));
  var filename;

  for (var i = 0, max = data.length; i < max; i += 1) {
    filename = 'pull_' + data[i].number + '.json';
    fs.writeFileSync(baseDir + 'pulls/' + filename, JSON.stringify(data[i]));
  }

}

function decomposeIssues(file) {

  var data = JSON.parse(fs.readFileSync(file));
  var filename;

  for (var i = 0, max = data.length; i < max; i += 1) {
    filename = 'issue_' + data[i].number + '.json';
    fs.writeFileSync(baseDir + 'issues/' + filename, JSON.stringify(data[i]));
  }

}

function decomposeCommits(file) {
  var data = JSON.parse(fs.readFileSync(file));
  var filename;

  for (var i = 0, max = data.length; i < max; i += 1) {
    filename = 'commit_' + data[i].sha + '.json';
    fs.writeFileSync(baseDir + 'commits/' + filename, JSON.stringify(data[i]));
  }
}

function decomposeReviews(file) {
  var data = JSON.parse(fs.readFileSync(file));
  var filename;

  var number = file.split(/[-.]/);
  number.pop();

  filename = 'review_' + number.pop() + '.json';
  fs.writeFileSync(baseDir + 'reviews/' + filename, JSON.stringify(data));
}

function decomposeEvents(file) {
  var data = JSON.parse(fs.readFileSync(file));
  var filename;

  for (var i = 0, max = data.length; i < max; i += 1) {
    filename = 'event_' + data[i].id + '.json';
    fs.writeFileSync(baseDir + 'events/' + filename, JSON.stringify(data[i]));
  }
}


glob(baseDir + '*.json', function(err, data) {

  //console.log(data);

  for (var i = 0, max = data.length; i < max; i += 1) {

    var name = getFileName(data[i]);

    if ( /^pr/.test(name) === true ) {
      decomposePullRequest(data[i]);
    } else if ( /^issues/.test(name) === true ) {
      decomposeIssues(data[i]);
    } else if ( /^commits/.test(name) === true ) {
      decomposeCommits(data[i]);
    } else if ( /^review/.test(name) === true ) {
      decomposeReviews(data[i]);
    } else if ( /^events/.test(name) === true ) {
      decomposeEvents(data[i]);
    }

  }

  console.log('Done!!');

});