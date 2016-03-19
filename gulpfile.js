var gulp = require('gulp');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var changed = require('gulp-changed');
var mainBowerFiles = require('main-bower-files');
var inject = require('gulp-inject');
var series = require('stream-series');
var filter = require('gulp-filter');
var plumber = require('gulp-plumber');
var replace = require('gulp-html-replace');
var git = require('git-rev-sync');
var templateCache = require('gulp-angular-templatecache');

var appPaths = {
  styles: ['./scss/**/*.scss', './scss/**/*.css'],
  scripts: ['./app/**/*.js', './app/*.js'],
  templates: 'templates/**/*.html',
};

var destRoot = './www/';
var destPaths = {
  css: destRoot + 'css/',
  js: destRoot + 'js/',
  lib: destRoot + 'lib/',
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
  '!ionic.css',
];

var bowerJsFilter = [
  '*',
  '!source-map.js',
  '!*.map.js',
];

gulp.task('styles', function (done) {
  // copy bower component styles
  gulp.src(mainBowerFiles())
    .pipe(changed(destPaths.lib))
    .pipe(filter(bowerCssFilter))
    .pipe(gulp.dest(destPaths.lib));

  // compile and minify app styles
  gulp.src(appPaths.styles)
    .pipe(plumber())
    .pipe(sass())
    .pipe(minifyCss(minifyCssOptions))
    .pipe(concat('style.min.css'))
    .pipe(changed(destPaths.css))
    .pipe(gulp.dest(destPaths.css));

  done();
});

gulp.task('scripts', function (done) {

  // copy bower component scripts
  gulp.src(mainBowerFiles())
    .pipe(filter(bowerJsFilter))
    .pipe(changed(destPaths.lib))
    .pipe(gulp.dest(destPaths.lib));

  // copy app scripts
  gulp.src(appPaths.scripts)
    /*.pipe(concat('app.js'))*/
    .pipe(changed(destPaths.js))
    .pipe(gulp.dest(destPaths.js));

  done();
});

gulp.task('templates', function (done) {
  gulp.src(appPaths.templates)
    .pipe(templateCache(templateCacheOptions))
    .pipe(replace({
      'git-head-sha': git.long(),
    }))
    .pipe(changed(destPaths.js))
    .pipe(gulp.dest(destPaths.js));

  done();
});

gulp.task('inject', ['templates', 'scripts', 'styles'], function (done) {
  var libStream = gulp.src([
    'Chart.js',
    'angular.js',
    'angular*.js',
    'ionic.js',
    'ionic*.js',
    'ng*.js',
    'stacktrace.min.js',
    'stack*.js',
    '*.js',
    '**/*.css', // + CSS
  ].map(function (filename) {
    return destPaths.lib + filename;
  }), injectSrcOptions);

  var appStream = gulp.src([
    destPaths.js + 'templates.js',
    destPaths.js + 'services/*.js',
    destPaths.js + 'controllers/*.js',
    destPaths.js + 'directives/*.js',
    destPaths.js + '**/*.js',
    destPaths.css + '**/*.css', // + CSS
  ], injectSrcOptions);

  gulp.src(destRoot + 'index.html')
    .pipe(inject(series(libStream, appStream), injectOptions))
    .pipe(gulp.dest(destRoot));

  done();
});

gulp.task('watch', ['default'], function () {
  gulp.watch(appPaths.styles, ['styles']);
  gulp.watch(appPaths.scripts, ['scripts']);
  gulp.watch(appPaths.templates, ['templates']);
});

gulp.task('default', ['styles', 'scripts', 'templates', 'inject']);
