'use strict';

var defaults = require('defaults');
var fs = require('fs-promise');
var mkdirp = require('mkdirp');
var path = require('path');
var through2 = require('through2');
var streamToPromise = require('stream-to-promise');

var temp = (function() {
    var md5 = require('md5');
    var invocations = 0;
    return function(filePath) {
        filePath = path.parse(filePath);
        filePath.base += "." + md5(filePath.base + process.pid + (++invocations));
        return path.format(filePath);
    }
})();

function writeBuffer(path, file, cb) {
    var opt = {mode: file.stat.mode};
    var tempPath = temp(path);
    fs.writeFile(tempPath, file.contents, opt).then(function() {
        return fs.rename(tempPath, path);
    }).catch(function(err) {
        return fs.unlink(tempPath);
    }).nodeify(cb);
};

function writeStream(path, file, cb) {
    var opt = {mode: file.stat.mode};
    var tempPath = temp(path);
    var outStream = fs.createWriteStream(tempPath, opt);
    streamToPromise(outStream).then(function() {
        return fs.rename(tempPath, path);
    }).catch(function(err) {
        return fs.unlink(tempPath);
    }).nodeify(cb);
    file.contents.pipe(outStream);
};

function writeContents(path, file, cb) {
    if (file.isNull()) return cb(null, file);
    if (file.isBuffer()) return writeBuffer(path, file, cb);
    if (file.isStream()) return writeStream(path, file, cb);
};

module.exports = function gulpDestAtomic(outFolder, opt) {
    opt = opt || {};

    if (typeof outFolder !== 'string' && typeof outFolder !== 'function') {
        throw new Error('Invalid output folder');
    }

    var options = defaults(opt, {
        cwd: process.cwd()
    });

    if (typeof options.mode === 'string') {
        options.mode = parseInt(options.mode, 8);
    }

    var cwd = path.resolve(options.cwd);

    function saveFile (file, enc, cb) {
        var basePath;
        if (typeof outFolder === 'string') {
            basePath = path.resolve(cwd, outFolder);
        }
        if (typeof outFolder === 'function') {
            basePath = path.resolve(cwd, outFolder(file));
        }
        var writePath = path.resolve(basePath, file.relative);
        var writeFolder = path.dirname(writePath);

        // wire up new properties
        file.stat = file.stat ? file.stat : new fs.Stats();
        file.stat.mode = (options.mode || file.stat.mode);
        file.cwd = cwd;
        file.base = basePath;
        file.path = writePath;

        // mkdirp the folder the file is going in
        mkdirp(writeFolder, function(err){
            if (err) return cb(err);
            writeContents(writePath, file, cb);
        });
    }

    var stream = through2.obj(saveFile);
    // TODO: option for either backpressure or lossy
    return stream;
};
