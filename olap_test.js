var Table   = require('olap-cube').model.Table;
var commits = require('./json/commits_bundle.json');
var moment  = require('moment');

var result = (function() {

  var i, len = commits.length;
  var res1 = [];
  var res2 = [];

  for (i = 0; i < len; i += 1) {

    var obj = {
      sha:           commits[i].sha,
      authorName:    commits[i].commit.author.name,
      authorId:      commits[i].commit.author.email,
      date:          commits[i].commit.author.date,
      message:       commits[i].commit.message,
      tree:          commits[i].commit.tree.sha,
      comment_count: commits[i].commit.comment_count,
      //parents:       commits[i].parents,
    };

    if ( commits[i].author != null ) {
      obj.authorName = commits[i].author.login;
      obj.authorId = commits[i].author.id;
    }

    res1.push([
      obj.authorName,
      obj.authorId,
      moment(obj.date).format('dddd'),
      moment(obj.date).format('MMMM'),
      moment(obj.date).format('YYYY'),
      moment(obj.date).format('HH'),
      moment(obj.date).format('mm')
    ]);

    res2.push([
      obj.sha,
      obj.message,
      obj.tree,
      obj.comment_count
    ]);
  }

  return [res1, res2];

})();

var points = result[0];
var data = result[1];

const table = new Table({
  dimensions: [ 'authorName', 'authorId', 'day', 'month', 'year', 'hour', 'minute' ],
  points: points,
  fields: ['sha', 'message', 'tree', 'comment_count'],
  data: data,
});

console.log(table.dice(function(pts) { return pts[4] === '2018'; }).rollup('authorName', ['year'], function (sum, value) {
  //console.log(value);
  return [sum[0] + 1];
  }, [0]).rows
);