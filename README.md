Write your built files out to disk atomically, with no downtime.

# Usage

Just replace your calls to `gulp.dest` with `destAtomic`. Each generated file
from the Vinyl stream will be written under a temporary name, then moved into
place.

`destAtomic` accepts all the same options as `gulp.dest`.

    var destAtomic = require('gulp-dest-atomic');

    gulp.task('build', function() {
      return gulp.src('some/*/glob')
        .pipe(someTransform())
        .pipe(destAtomic('./dest/path'));
    });

You could also load it with `gulp-load-plugins` if you prefer:

    var $ = require('gulp-load-plugins')();

    gulp.task('build', function() {
      return gulp.src('some/*/glob')
        .pipe(someTransform())
        .pipe($.destAtomic('./dest/path'));
    });
