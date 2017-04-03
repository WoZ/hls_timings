const https = require('https');
const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2));

if (!_.has(argv, '_')) {
  process.exit();
}

const Hlsdump = require('./hlsdump.js');

let masterPlaylistUrl;
if (argv._.length === 1) {
  masterPlaylistUrl = argv._[0];
  start(masterPlaylistUrl);
} else if (argv._.length === 3) {
  let balancerUrl = argv._[0];
  let stream = argv._[1];
  let property = argv._[2];
  balancerUrl = balancerUrl.replace('%STREAM%', stream);
  let startTime = process.hrtime();

  const req = https.request(balancerUrl, (res) => {
    if (res.statusCode !== 200) {
      console.log('Balancer response has respond with ' + res.statusCode + ', ' + balancerUrl);
      process.exit(1);
    } else {
      let data = '';
      res.setEncoding('utf8');

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        let timeElapsed = process.hrtime(startTime);
        console.log('[Balancer]loadTime=%s', timeElapsed);
        if (data.length > 0) {
          data = data.replace('( ', '').replace(' )', '');
        }

        data = JSON.parse(data);
        if (!data.hasOwnProperty(property)) {
          console.log('Property ' + property + ' is not found in ' + JSON.stringify(data));
          process.exit(1);
        }

        if (data[property] === null) {
          console.log('Property ' + property + ' is null, stream on edge is not available, ' + JSON.stringify(data));
          process.exit(1);
        }

        if (data.online !== '1') {
          console.log('Stream is offline');
          process.exit(1);
        }

        let lcStream = stream.toLowerCase();

        let url = `http://${data[property]}:1935/cams/${lcStream}/${lcStream}/playlist.m3u8`;
        console.log(`Starting ${url}`);
        start(url);
      });
    }
  });

  req.on('error', function (err) {
    console.log('Balancer error', err.toString());
  });

  req.end();
} else {
  console.log('Unknown format of arguments');
}


function start(masterPlaylistUrl) {
  var settings = {
    url: masterPlaylistUrl,
    duration: 300,
    bandwidth: null,
    temporary_folder: 'tmp/',
    retry: 3
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

  dump.on('chunk_stats', function (stats) {
    console.log('[Media]\t\tstatusCode=%d\tchunkDuration=%s\tloadTime=%s\tpath=%s',
      stats.statusCode, stats.chunkDuration, stats.loadTime, stats.path);
  });

  dump.on('done', function () {
    console.log("Done");
  });

  dump.start();

  process.on('SIGINT', function () {
    console.log('some info');
    process.exit();
  });
}