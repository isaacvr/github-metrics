/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var glob   = require('glob');
var fs     = require('fs');
var moment = require('moment');

var TIMEOUT = 10;

var mergeSort = function mergeSort(arr, fn) {

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

var handlers = {
  commits: function (arr) {

    if ( arr.length === 0 ) {
      return [];
    }

    mergeSort(arr, function(a, b) {
      var ma, mb;
      ma = moment(a.commit.author.date);
      mb = moment(b.commit.author.date);
      return ma.diff(mb) >= 0;
    });

    var res = [], pos = 0;

    res.push( arr[0] );

    for (var i = 1, max = arr.length; i < max; i += 1) {
      if ( arr[i].sha != res[pos].sha ) {
        res.push(arr[i]);
        pos += 1;
      }
    }

    return res;

  }
};

function bundle(file) {

  glob(__dirname + '/json/' + file + '*.json', function (err, data) {
    var i = 0, max = data.length;
    var res = [];

    var itv = setInterval(function () {
      if (i >= max) {
        clearInterval(itv);
        if ( handlers.hasOwnProperty(file) === true ) {
          var result = handlers[file](res);
          fs.writeFileSync(__dirname + '/json/' + file + '_bundle.json', JSON.stringify(result));
        } else {
          fs.writeFileSync(__dirname + '/json/' + file + '_bundle.json', JSON.stringify(res));
        }
        console.log('Done with ' + file + '!');
        return;
      }

      if (data[i].indexOf('bundle') > -1) {
        i++;
        return;
      }

      var obj = require(data[i++]);

      res = res.concat(obj);

    }, TIMEOUT);
  });

}

bundle('commits');
bundle('events');
bundle('issues');
bundle('reviews');
bundle('pulls');