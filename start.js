const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2));

if (!_.has(argv, '_')) {
  process.exit();
}

if (argv._.length !== 1) {
  console.log('Must receive exactly one argument');
}

const masterPlaylistUrl = argv._[0];

const Hlsdump = require('./hlsdump.js');

var settings = {
  url: masterPlaylistUrl,
  duration: 300,
  bandwidth: null,
  temporary_folder: 'tmp/',
  retry : 3
};

var dump = new Hlsdump(settings, function (err, result) {
  if (err !== null) {
    console.error('callback error');
    console.error(err);
  } else {
    console.log('callback result');
    console.log(result);
  }
});

dump.on('playlist', function (playlist, playlistStats) {
  console.log('[Playlist]\tstatusCode=%d\t\t\t\tloadTime=%s\tpath=%s', playlistStats.statusCode, playlistStats.loadTime, playlistStats.path);
});

dump.on('error', function (err) {
  console.error("Error:");
  console.error(err);
});

dump.on('downloaded', function (files) {

});

dump.on('chunk_stats', function(stats) {
  console.log('[Media]\t\tstatusCode=%d\tchunkDuration=%s\tloadTime=%s\tpath=%s',
    stats.statusCode, stats.chunkDuration, stats.loadTime, stats.path);
});

dump.on('done', function () {
  console.log("Done");
});

dump.start();

process.on('SIGINT', function() {
  console.log('some info');
  process.exit();
});