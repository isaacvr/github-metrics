/**
 * @author: Isaac Vega Rodriguez          <isaacvega1996@gmail.com>
 */

'use strict';

var glob   = require('glob');
var fs     = require('fs');
var dirs = require('./repos').dirs;

function cleanFiles(path) {

  glob(path + '/*.json', function(err, files) {

    if ( err ) {
      console.log('ERROR: ', err);
      return;
    }

    var ok = 0, fail = 0;

    for (var i = 0, maxi = files.length; i < maxi; i += 1) {
      try {
        JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
        ok += 1;
      } catch(e) {
        fs.unlinkSync(files[i]);
        fail += 1;
      }
    }

    console.log('OK %d    FAIL %d', ok, fail);

  });

}

for (var i = 0, maxi = dirs.length; i < maxi; i += 1) {
  cleanFiles(dirs[i]);
}