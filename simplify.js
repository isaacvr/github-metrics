/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var glob = require('glob');
var fs = require('fs');

function getFileName(dir) {

  var name = dir.split('/').pop();

  return name;

}

function __simpl(obj, fields) {

  var temp = {};

  for (var j = 0, max1 = fields.length; j < max1; j += 1) {
    if ( typeof fields[j] === 'string' ) {
      if ( obj.hasOwnProperty(fields[j]) === true ) {
        temp[ fields[j] ] = obj[ fields[j] ];
      }
    } else {
      for (var k in fields[j]) {
        if ( fields[j].hasOwnProperty(k) === true ) {
          //console.log('Property ', k);
          temp[k] = simplify(obj[k], fields[j][k]);
        }
      }
    }
  }

  return temp;

}

function simplify(obj, fields) {

  var newObj;

  if ( Array.isArray(obj) === true ) {

    newObj = [];

    for (var i = 0, max = obj.length; i < max; i += 1) {
      newObj.push( __simpl(obj[i], fields) );
    }

  } else {

    newObj = __simpl(obj, fields);

  }

  return newObj;

}

function simplifyPullRequest(file) {

  var fields = [
    'title',
    'created_at',
    'closed_at',
    'merged_at',
    'labels',
    'state',
    'number',
    'requested_reviewers',
    {
      head: [
        'user'
      ]
    }
  ];

  var obj;

  try {
    obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    //console.log(obj[0]);
    obj = JSON.stringify(simplify(obj, fields));

    fs.writeFile(file, obj, function(err) {

      if ( err ) {
        console.log('ERROR: ', err.message);
        return;
      }

      console.log('Saved: ', file);

    });
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyIssues(file) {

  var fields = [
    'title',
    'created_at',
    'closed_at',
    'user',
    'state',
    'number',
    'comments'
  ];

  var obj;

  try {
    obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    //console.log(obj[0]);
    obj = JSON.stringify(simplify(obj, fields));

    fs.writeFile(file, obj, function(err) {

      if ( err ) {
        console.log('ERROR: ', err.message);
        return;
      }

      console.log('Saved: ', file);

    });
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyCommits(file) {

  var fields = [
    'commit'
  ];

  var obj;

  try {
    obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    //console.log(obj[0]);
    obj = JSON.stringify(simplify(obj, fields));

    fs.writeFile(file, obj, function(err) {

      if ( err ) {
        console.log('ERROR: ', err.message);
        return;
      }

      console.log('Saved: ', file);

    });
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyReviews(file) {

  var fields = [
    'body',
    'state',
    {
      user: [
        'login'
      ]
    }
  ];

  var obj;

  try {
    obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    //console.log(obj[0]);
    obj = JSON.stringify(simplify(obj, fields));

    fs.writeFile(file, obj, function(err) {

      if ( err ) {
        console.log('ERROR: ', err.message);
        return;
      }

      console.log('Saved: ', file);

    });
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log(e.constructor.name + ':', e.message);
  }

}

glob(__dirname + '/json/*.json', function(err, data) {

  //console.log(data);

  for (var i = 0, max = data.length; i < max; i += 1) {

    var name = getFileName(data[i]);

    if ( /^pr/.test(name) === true ) {
      simplifyPullRequest(data[i]);
    } else if ( /^issues/.test(name) === true ) {
      simplifyIssues(data[i]);
    } else if ( /^commits/.test(name) === true ) {
      simplifyCommits(data[i]);
    } else if ( /^review/.test(name) === true ) {
      simplifyReviews(data[i]);
    }

    // var js = fs.readFileSync(data[i], 'utf8');

    // console.log(JSON.parse(js));

  }

});