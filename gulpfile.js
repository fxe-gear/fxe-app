var gulp = require('gulp');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var mainBowerFiles = require('main-bower-files');
var inject = require('gulp-inject');
var series = require('stream-series');
var filter = require('gulp-filter');
var plumber = require('gulp-plumber');
var replace = require('gulp-replace');
var git = require('git-rev-sync');
var templateCache = require('gulp-angular-templatecache');

var appPaths = {
  styles: ['./scss/**/*.scss', './scss/**/*.css'],
  scripts: ['./app/**/*.js', './app/*.js'],
};

var minifyCssOptions = {
  keepSpecialComments: 0,
};

var injectSrcOptions = {
  read: false,
};

var injectOptions = {
  relative: true,
};

var bowerCssFilter = [
  '*.css',
  '!*.map.css',
];

var bowerJsFilter = [
  '*',
  '!source-map.js',
  '!*.map.js',
];

gulp.task('styles', function(done) {
  // copy bower component styles
  gulp.src(mainBowerFiles())
    .pipe(filter(bowerCssFilter))
    .pipe(gulp.dest('./www/lib'));

  // compile and minify app styles
  gulp.src(appPaths.styles)
    .pipe(plumber())
    .pipe(sass())
    .pipe(minifyCss(minifyCssOptions))
    .pipe(concat('style.min.css'))
    .pipe(gulp.dest('./www/css/'));

  // inject
  var libStream = gulp.src('./www/lib/**/*.css', injectSrcOptions);
  var appStream = gulp.src('./www/css/**/*.css', injectSrcOptions);
  gulp.src('./www/index.html')
    .pipe(inject(series(libStream, appStream), injectOptions))
    .pipe(gulp.dest('./www'));

  done();
});

gulp.task('scripts', function(done) {

  // copy bower component scripts
  gulp.src(mainBowerFiles())
    .pipe(filter(bowerJsFilter))
    .pipe(gulp.dest('./www/lib'));

  // copy app scripts
  gulp.src(appPaths.scripts)
    /*.pipe(concat('app.js'))*/
    .pipe(gulp.dest('./www/js'));

  // inject into index.html
  var libStream = gulp.src([
    './www/lib/angular.js',
    './www/lib/angular*.js',
    './www/lib/ionic.js',
    './www/lib/ionic*.js',
    './www/lib/ng*.js',
    './www/lib/stacktrace.min.js',
    './www/lib/stack*.js',
    './www/lib/Chart.js',
    './www/lib/*.js',
  ], injectSrcOptions);
  var appStream = gulp.src([
    './www/js/services/*.js',
    './www/js/controllers/*.js',
    './www/js/directives/*.js',
    './www/js/**/*.js',
  ], injectSrcOptions);
  gulp.src('./www/index.html')
    .pipe(inject(series(libStream, appStream), injectOptions))
    .pipe(gulp.dest('./www'));

  done();
});

gulp.task('tag-git-head', function(done) {
  gulp.src('./www/index.html')
    .pipe(replace(
      new RegExp('<!-- gulp-replace:git-head-sha:\\w+ -->'),
      '<!-- gulp-replace:git-head-sha:' + git.long() + ' -->'
    ))
    .pipe(gulp.dest('./www'));

  done();
});

gulp.task('watch', function(done) {
  gulp.watch(appPaths.styles, ['styles']);
  gulp.watch(appPaths.scripts, ['scripts']);
  done();
});

gulp.task('default', ['scripts', 'styles']);
