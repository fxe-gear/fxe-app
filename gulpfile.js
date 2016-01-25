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
  templates: 'templates/**/*.html',
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

templateCacheOptions = {
  standalone: true,
  module: 'experience.templates',
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

  gulp.start('inject');
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

  gulp.start('inject');
  done();
});

gulp.task('templates', function(done) {
  gulp.src(appPaths.templates)
    .pipe(templateCache(templateCacheOptions))
    .pipe(gulp.dest('./www/js'));

  gulp.start('inject');
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

gulp.task('inject', function(done) {
  var libStream = gulp.src([
    './www/lib/Chart.js',
    './www/lib/angular.js',
    './www/lib/angular*.js',
    './www/lib/ionic.js',
    './www/lib/ionic*.js',
    './www/lib/ng*.js',
    './www/lib/stacktrace.min.js',
    './www/lib/stack*.js',
    './www/lib/*.js',
    './www/lib/**/*.css', // + CSS
  ], injectSrcOptions);
  var appStream = gulp.src([
    './www/js/templates.js',
    './www/js/services/*.js',
    './www/js/controllers/*.js',
    './www/js/directives/*.js',
    './www/js/**/*.js',
    './www/css/**/*.css', // + CSS
  ], injectSrcOptions);

  gulp.src('./www/index.html')
    .pipe(inject(series(libStream, appStream), injectOptions))
    .pipe(gulp.dest('./www'));

  done();
});

gulp.task('watch', function(done) {
  gulp.watch(appPaths.styles, ['styles']);
  gulp.watch(appPaths.scripts, ['scripts']);
  gulp.watch(appPaths.templates, ['templates']);
  done();
});

gulp.task('default', ['scripts', 'styles', 'templates', 'inject']);
