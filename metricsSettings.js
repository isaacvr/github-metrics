var list = require('./repos').dirs;

module.exports = {
  owner: 'simelo',
  repo: 'skycoin',
  list: list.map(function(e) { var s = e.split('_'); return [s[1], s[2]] }),
  /*proxy: 'http://10.8.43.169:3128',//*/
  since: '2019-02-25T00:00:00Z',
  maxPage: Infinity
};