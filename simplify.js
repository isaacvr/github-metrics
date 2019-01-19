/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var glob = require('glob');
var fs = require('fs');

var TIMEOUT = 50;

function getFileName(dir) {

  var name = dir.split('/').pop();

  return name;

}

function __simpl(obj, fields) {

  var temp = {};

  if ( !obj ) {
    return obj;
  }

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
    'state',
    'number',
    {
      assignees: [
        'login',
        'id'
      ]
    },
    {
      user: [
        'login',
        'id'
      ]
    },
    {
      labels: [
        'color',
        'name'
      ]
    },
    {
      requested_reviewers: [
        'login'
      ]
    }
  ];

  var obj;

  try {
    
    var strData = fs.readFileSync(file, 'utf8');

    if ( strData.trim() != '' ) {

      obj = JSON.parse(strData);
      //console.log(obj[0]);
      obj = JSON.stringify(simplify(obj, fields));

      fs.writeFile(file, obj, function(err) {

        if ( err ) {
          console.log('ERROR: ', err.message);
          return;
        }

        console.log('Saved: ', file);

      });
    }
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log('ERROR: ', file);
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyIssues(file) {

  var userInfo = [ 'login', 'id' ];
  var fields = [
    'title',
    'created_at',
    'closed_at',
    {
      user: userInfo
    },
    {
      labels: [
        'name',
        'color'
      ]
    },
    {
      assignees: userInfo
    },
    'state',
    'number',
    'comments'
  ];

  var obj;

  try {
    var strData = fs.readFileSync(file, 'utf8');

    if ( strData.trim() != '' ) {

      obj = JSON.parse(strData);
      //console.log(obj[0]);
      obj = JSON.stringify(simplify(obj, fields));

      fs.writeFile(file, obj, function(err) {

        if ( err ) {
          console.log('ERROR: ', err.message);
          return;
        }

        console.log('Saved: ', file);

      });

    }
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log('ERROR: ', file);
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyCommits(file) {

  var fields = [
    'sha',
    {
      commit: [
        'author',
        'message',
        {
          tree: [
            'sha'
          ]
        },
        'comment_count'
      ],
      author: [
        'login',
        'id'
      ],
      parents: [
        'sha'
      ]
    }
  ];

  var obj;

  try {
    var strData = fs.readFileSync(file, 'utf8');

    if ( strData.trim() != '' ) {

      obj = JSON.parse(strData);
      //console.log(obj[0]);
      obj = JSON.stringify(simplify(obj, fields));

      fs.writeFile(file, obj, function(err) {

        if ( err ) {
          console.log('ERROR: ', err.message);
          return;
        }

        console.log('Saved: ', file);

      });
    }
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log('ERROR: ', file);
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyReviews(file) {

  var fields = [
    'body',
    'state',
    {
      user: [
        'login',
        'id'
      ]
    },
    'pull_request_url'
  ];

  var obj;

  try {

    var strData = fs.readFileSync(file, 'utf8');

    if ( strData.trim() != '' ) {

      obj = JSON.parse(strData);
      //console.log(obj[0]);
      obj = JSON.stringify(simplify(obj, fields));

      fs.writeFile(file, obj, function(err) {

        if ( err ) {
          console.log('ERROR: ', err.message);
          return;
        }

        console.log('Saved: ', file);

      });
      
    }
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log('ERROR: ', file);
    console.log(e.constructor.name + ':', e.message);
  }

}

function simplifyEvents(file) {

  var fields = [
    'id',
    'event',
    'created_at',
    'commit_id',
    {
      actor: [
        'login'
      ]
    },
    {
      issue: [
        'number'
      ]
    }
  ];

  var obj;

  try {
    var strData = fs.readFileSync(file, 'utf8');

    if ( strData.trim() != '' ) {

      obj = JSON.parse(strData);
      //console.log(obj[0]);
      obj = JSON.stringify(simplify(obj, fields));

      fs.writeFile(file, obj, function(err) {

        if ( err ) {
          console.log('ERROR: ', err.message);
          return;
        }

        console.log('Saved: ', file);

      });
    }
    //console.log('-----------------------------------------------------');
    //console.log(obj[0]);
  } catch(e) {
    console.log('ERROR: ', file);
    console.log(e.constructor.name + ':', e.message);
  }

}

function makeSimplification(dir, prefix, callback) {

  glob(__dirname + '/' + dir + '/' + prefix + '*.json', function(err, data) {
    var i = 0, max = data.length;

    var itv = setInterval(function() {
      if ( i === max ) {
        clearInterval(itv);
        return;
      }
      if ( data[i].indexOf('bundle') > -1 ) {
        i++;
      } else {
        callback(data[i++]);
      }
    }, TIMEOUT);
  });

}

var dirs = require('./repos').dirs;

for (var i = 0; i < dirs.length; i += 1) {
  makeSimplification(dirs[i], 'commits', simplifyCommits);
  makeSimplification(dirs[i], 'events', simplifyEvents);
  makeSimplification(dirs[i], 'issues', simplifyIssues);
  makeSimplification(dirs[i], 'review', simplifyReviews);
  makeSimplification(dirs[i], 'pr', simplifyPullRequest);
}