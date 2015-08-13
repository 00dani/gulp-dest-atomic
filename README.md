# gulp-dest-atomic

> drop-in replacement for [gulp.dest](https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpdestpath-options) that writes output atomically

# Usage

Just replace your calls to `gulp.dest` with `destAtomic`. Each generated file
from the Vinyl stream will be written under a temporary name, then moved into
place.

`destAtomic` accepts all the same options as [`gulp.dest`](https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpdestpath-options).

```js
var destAtomic = require('gulp-dest-atomic');

gulp.task('build', function() {
  return gulp.src('some/*/glob')
    .pipe(someTransform())
    .pipe(destAtomic('./dest/path'));
});
```

You could also load it through [`gulp-load-plugins`](https://www.npmjs.com/package/gulp-load-plugins) if you prefer:

```js
var $ = require('gulp-load-plugins')();

gulp.task('build', function() {
  return gulp.src('some/*/glob')
    .pipe(someTransform())
    .pipe($.destAtomic('./dest/path'));
});
```
