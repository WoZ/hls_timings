var http = require("http"),
    url = require("url"),
    fs = require("fs"),
    util = require("util");

var PlaylistInfItem = function (baseurl, parameters, path) {

    PlaylistInfItem.prototype._initialize = function (baseurl, parameters, path) {
        var self = this,
            splittedParameters,
            splittedValue,
            i;

        self.type = "inf";

        if (/^http\:\/\//.test(path) === false) {
            self.url = baseurl + path;
        } else {
            self.url = path;
        }

        splittedParameters = parameters.split(/, {0,1}/);

        self.path = path;
        self.duration = parseFloat(splittedParameters[0], 10);
        self.description = splittedParameters[1];

    };

    PlaylistInfItem.prototype.download = function (filename, dumpChunks, callback) {
        var self = this,
            objUrl = url.parse(self.url, true);
        let startTime = process.hrtime();
        let req = http.request(objUrl, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400) {
                console.log('[Media] statusCode=%d, path=%s', res.statusCode, self.path);
                self.download(filename, dumpChunks, callback);
            } else {
                var data = '';
                res.setEncoding('binary');

                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    let timeElapsed = process.hrtime(startTime);
                    let stats = {
                        statusCode: res.statusCode,
                        path: self.path,
                        loadTime: util.format('%d.%d', timeElapsed[0], (timeElapsed[1]/1000000).toFixed(0)),
                        chunkDuration: self.duration,
                    };

                    if (dumpChunks) {
                        fs.appendFile(filename, data, 'binary', function (err) {
                            if (err) {
                                callback(err, stats);
                            } else {
                                callback(null, stats);
                            }
                        });
                    } else {
                        callback(null, stats);
                    }
                });
            }
        });

        req.on('error', function (err) {
            let timeElapsed = process.hrtime(startTime);
            let stats = {
                statusCode: 0,
                path: self.path,
                loadTime: util.format('%d.%d', timeElapsed[0], (timeElapsed[1]/1000000).toFixed(0)),
                chunkDuration: self.duration,
            };

            callback(err, stats);
        });

        req.end();
    };

    PlaylistInfItem.prototype.getId = function () {
        var self = this,
            path = require('path'),
            urls = url.parse(self.url),
            matches;

        matches = /([0-9]+)$/.exec(path.basename(urls.pathname, path.extname(urls.pathname)));

        if (typeof matches[1] === 'undefined') {
            throw new Error("Can't get the id of the par of video " + self.url);
        }


        return matches[1];
    };

    this._initialize(baseurl, parameters, path);
};

module.exports = PlaylistInfItem;