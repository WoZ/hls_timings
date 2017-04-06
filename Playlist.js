var http = require("http"),
    https = require("https"),
    url = require("url"),
    util = require("util"),
    EventEmitter = require('events').EventEmitter,
    PlaylistStreamItem = require("./PlaylistStreamItem.js"),
    PlaylistInfItem = require("./PlaylistInfItem.js"),
    PlaylistVersionItem = require("./PlaylistVersionItem.js"),
    PlaylistTargetDurationItem = require("./PlaylistTargetDurationItem.js");

var Playlist = function (path, retry) {
    Playlist.prototype._initialize = function (path) {
        var self = this;

        self.retry = retry;
        self.url = path;
    };

    Playlist.prototype._download = function (callback) {
        var self = this,
            urls = url.parse(self.url, true, true),
            path = require('path'),
            req;

        self.baseurl = urls.protocol + "//" + urls.hostname;

        if (urls.port !== null) {
            self.baseurl += ':' + urls.port;
        }

        self.baseurl += path.dirname(urls.pathname) + "/";

        let startTime = process.hrtime();
        const httprOrHttps = urls.protocol === 'http:' ? http : https;
        req = httprOrHttps.request(urls, function (res) {

            if (res.statusCode !== 200) {
                let timeElapsed = process.hrtime(startTime);
                let stats = {
                    statusCode: res.statusCode,
                    path: urls.pathname,
                    loadTime: util.format('%d.%d', timeElapsed[0], (timeElapsed[1]/1000000).toFixed(0))
                };

                callback(new Error("404 Not found"), null, stats);
            } else {
                var data = '';
                res.setEncoding('utf8');

                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    let timeElapsed = process.hrtime(startTime);
                    let stats = {
                        statusCode: res.statusCode,
                        path: urls.pathname,
                        loadTime: util.format('%d.%d', timeElapsed[0], (timeElapsed[1]/1000000).toFixed(0))
                    };
                    callback(null, data, stats);
                });
            }
        });

        req.on('error', function (err) {
            let timeElapsed = process.hrtime(startTime);
            let stats = {
                statusCode: res.statusCode,
                path: urls.pathname,
                loadTime: util.format('%d.%d', timeElapsed[0], (timeElapsed[1]/1000000).toFixed(0))
            };
            callback(err, null, stats);
        });

        req.end();
    };

    Playlist.prototype.serialize = function (datas, callback) {
        var self = this,
            splittedDatas,
            lineNumber,
            splittedLine,
            item,
            items = [];

        self.id = 0;
        self.parent = 0;

        splittedDatas = datas.split("\n");

        if (splittedDatas[0] !== "#EXTM3U") {
            callback(new Error("This playlist isn't a m3u8 playlist"));
        } else {
            if (splittedDatas[splittedDatas.length - 1] === "") {
                splittedDatas.pop();
            }

            for (lineNumber = 1; lineNumber < splittedDatas.length; lineNumber = lineNumber + 1) {
                splittedLine = splittedDatas[lineNumber].split(":");

                switch (splittedLine[0]) {
                case "#EXT-X-STREAM-INF":
                    try {
                        self.type = "streams";
                        item = new PlaylistStreamItem(self.baseurl, splittedLine[1], splittedDatas[lineNumber + 1]);
                        items.push(item);
                        lineNumber = lineNumber + 1;
                    } catch (ExceptionStreamInf) {
                        callback(new Error(ExceptionStreamInf), null);
                        return;
                    }
                    break;

                case "#EXT-X-TARGETDURATION":
                    try {
                        self.type = "media_sequence";
                        item = new PlaylistTargetDurationItem(splittedLine[1]);
                        items.push(item);
                    } catch (ExceptionTargetDuration) {
                        callback(new Error(ExceptionTargetDuration), null);
                        return;
                    }
                    break;
                case "#EXT-X-MEDIA-SEQUENCE":
                    self.type = "media_sequence";
                    break;
                case "#EXTINF":
                    try {
                        self.type = "media_sequence";
                        item = new PlaylistInfItem(self.baseurl, splittedLine[1], splittedDatas[lineNumber + 1]);
                        items.push(item);
                        lineNumber = lineNumber + 1;
                    } catch (ExceptionExtInf) {
                        callback(new Error(ExceptionExtInf), null);
                        return;
                    }
                    break;
                case "EXT-X-ENDLIST":
                    break;

                case "#EXT-X-VERSION":
                    try {
                        item = new PlaylistVersionItem(splittedLine[1]);
                        self.version = item.version;
                    } catch (ExceptionVersion) {
                        callback(new Error(ExceptionVersion), null);
                        return;
                    }
                    break;
                }
            }
            self.items = items;
            callback(null, self);
        }

    };

    Playlist.prototype.get = function (callback, playlistItem) {
        var self = this;
        if (typeof playlistItem === 'undefined') {
            playlistItem = null;
        }

        self._download(function (err, data, stats) {
            if (err !== null) {
                callback(new Error("Can't downloading playlist file " + err), null, stats);
            } else {
                self.serialize(data, function (err, data) {
                    callback(err, data, playlistItem, stats);
                });
            }
        });
    };
    this._initialize(path);
};

util.inherits(Playlist, EventEmitter);

module.exports = Playlist;