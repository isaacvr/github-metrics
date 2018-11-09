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
    return temp;
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
    {
      commit: [
        'author',
        'committer',
        'message',
        {
          tree: [
            'sha'
          ]
        },
        'comment_count'
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

glob(__dirname + '/json/commits/*.json', function(err, data) {
  var i = 0, max = data.length;

  var itv = setInterval(function() {
    if ( i === max ) {
      clearInterval(itv);
      return;
    }
    simplifyCommits(data[i++]);
  }, TIMEOUT);
});

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