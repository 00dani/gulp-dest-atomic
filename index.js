'use strict';

var defaults = require('defaults');
var fs = require('fs-extra');
var mkdirp = require('mkdirp');
var path = require('path');
var through2 = require('through2');
var streamToPromise = require('stream-to-promise');

var temp = (function() {
    var md5 = require('md5');
    var pathParse = require('path-parse');
    var pathFormat = require('path-format');
    var invocations = 0;
    return function(filePath) {
        filePath = pathParse(filePath);
        filePath.base += "." + md5(filePath.base + process.pid + (++invocations));
        return pathFormat(filePath);
    }
})();

function writeBuffer(tempPath, file) {
    var opt = {mode: file.stat.mode};
    return fs.writeFile(tempPath, file.contents, opt);
}

function writeStream(tempPath, file) {
    var opt = {mode: file.stat.mode};
    var outStream = fs.createWriteStream(tempPath, opt);
    file.contents.pipe(outStream);
    return streamToPromise(outStream);
}

function writeContents(path, file, cb) {
    var done = function() { cb(null, file); },
        fail = function(err) { cb(err, file); };
    if (file.isNull()) return done();

    var tempPath = temp(path), written;
    if (file.isBuffer()) {
        written = writeBuffer(tempPath, file);
    } else if (file.isStream()) {
        written = writeStream(tempPath, file);
    }

    written = written.then(function() {
        return fs.rename(tempPath, path);
    }).catch(function(err) {
        return fs.unlink(tempPath).then(function() {
            throw err;
        });
    });

    if (file.stat && typeof file.stat.mode === 'number') {
        written = written.then(function() {
            return fs.stat(path);
        }).then(function(st) {
            if ((st.mode & 4095) !== file.stat.mode) {
                return fs.chmod(path, file.stat.mode);
            }
        });
    }

    written.then(done, fail);
}

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
