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

var paths = {
  styles: ['./scss/**/*.scss', './scss/**/*.css'],
  scripts: ['./app/**/*.js', './app/*.js'],
};

gulp.task('styles', function() {
  gulp.src(paths.styles)
      .pipe(plumber())
      .pipe(sass())
      .pipe(minifyCss({
        keepSpecialComments: 0,
      }))
      .pipe(concat('style.min.css'))
      .pipe(gulp.dest('./www/css/'));
});

gulp.task('scripts', function() {

  // copy bower scripts
  gulp.src(mainBowerFiles())
      .pipe(filter([
        '*',
        '!source-map.js',
      ]))
      .pipe(gulp.dest('./www/lib'));

  // copy app scripts
  gulp.src(paths.scripts)
    // .pipe(concat('app.js'))
    .pipe(gulp.dest('./www/js'));

  // inject into index.html
  var libStream = gulp.src([
    './www/lib/angular.js',
    './www/lib/Chart.js',
    './www/lib/angular*.js',
    './www/lib/ionic.js',
    './www/lib/ionic*.js',
    './www/lib/ng*.js',
    './www/lib/stacktrace.min.js',
    './www/lib/stack*.js',
    './www/lib/*.js',
    './www/lib/**/*.css',
  ], {read: false});
  var appStream = gulp.src([
    './www/js/services/*.js',
    './www/js/controllers/*.js',
    './www/js/directives/*.js',
    './www/js/**/*.js',
    './www/css/**/*.css',
  ], {read: false});
  gulp.src('./www/index.html')
      .pipe(inject(series(libStream, appStream), {relative: true}))
      .pipe(gulp.dest('./www'));
});

gulp.task('watch', function() {
  gulp.watch(paths.styles, ['styles']);
  gulp.watch(paths.scripts, ['scripts']);
});

gulp.task('default', ['scripts', 'styles']);
