var gulp = require('gulp');
var util = require('gulp-util');
var del = require('del');
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
var sourcemaps = require('gulp-sourcemaps');
var git = require('git-rev-sync');
var templateCache = require('gulp-angular-templatecache');

var appPaths = {
  styles: 'scss/**/*.scss',
  scripts: 'app/**/*.js',
  images: 'img/**/*',
  templates: 'templates/**/*.html',
  index: 'templates/index.html'
};

var destRoot = 'www/';
var destPaths = {
  css: destRoot + 'css/',
  js: destRoot + 'js/',
  img: destRoot + 'img/',
  lib: destRoot + 'lib/',
  index: destRoot + 'index.html'
};

var minifyCssOptions = {
  keepSpecialComments: 0
};

var injectSrcOptions = {
  read: false
};

var injectOptions = {
  addRootSlash: false,
  ignorePath: destRoot
};

templateCacheOptions = {
  standalone: true,
  module: 'fxe.templates'
};

var bowerCssFilter = [
  '*.css',
  '_*',
  '!*.map.css',
  '!ionic.css'
];

var bowerJsFilter = [
  '*',
  '!*.css',
  '!source-map.js',
  '!*.map.js'
];

// enable relase mode based on `--release` CLI option
var RELEASE_MODE = false;
process.argv.forEach(function (val) {
  if (val.match(/^--release$/)) {
    RELEASE_MODE = true;
    util.log(util.colors.inverse(' RELEASE MODE ON '));
  }
});

// ------------------------------------------------------------------------

// copy bower component styles
gulp.task('lib-styles', function () {
  return gulp.src(mainBowerFiles())
    .pipe(changed(destPaths.lib))
    .pipe(filter(bowerCssFilter))
    .pipe(gulp.dest(destPaths.lib));
});

// compile and minify app styles
gulp.task('app-styles', function () {
  return gulp.src(appPaths.styles)
    .pipe(plumber())
    .pipe(RELEASE_MODE ? sourcemaps.init() : util.noop())
    .pipe(sass())
    .pipe(minifyCss(minifyCssOptions))
    .pipe(RELEASE_MODE ? concat('style.min.css') : util.noop())
    .pipe(changed(destPaths.css))
    .pipe(RELEASE_MODE ? sourcemaps.write() : util.noop())
    .pipe(gulp.dest(destPaths.css));
});

gulp.task('styles', ['lib-styles', 'app-styles']);

// ------------------------------------------------------------------------

// copy bower component scripts
gulp.task('lib-scripts', function () {
  return gulp.src(mainBowerFiles())
    .pipe(filter(bowerJsFilter))
    .pipe(changed(destPaths.lib))
    .pipe(gulp.dest(destPaths.lib));
});

// copy app scripts
gulp.task('app-scripts', function () {
  return gulp.src(appPaths.scripts)
    .pipe(RELEASE_MODE ? sourcemaps.init() : util.noop())
    .pipe(RELEASE_MODE ? concat('app.js') : util.noop())
    .pipe(changed(destPaths.js))
    .pipe(RELEASE_MODE ? sourcemaps.write() : util.noop())
    .pipe(gulp.dest(destPaths.js));
});

gulp.task('scripts', ['lib-scripts', 'app-scripts']);

// ------------------------------------------------------------------------

gulp.task('templates', function () {
  return gulp.src(appPaths.templates)
    .pipe(templateCache(templateCacheOptions))
    .pipe(replace({
      'git-head-sha': git.long(),
      'git-tag': git.tag(),
      'git-branch': git.branch(),
      date: new Date().toString()
    }))
    .pipe(changed(destPaths.js))
    .pipe(gulp.dest(destPaths.js));
});

gulp.task('inject', ['templates', 'scripts', 'styles'], function () {
  var libStream = gulp.src([
    'd3.js',
    'nv.d3.js',
    'angular.js',
    'angular*.js',
    'ionic.js',
    'ionic*.js',
    'ng*.js',
    'stacktrace.min.js',
    'stack*.js',
    'SocialSharing.js',
    '*.js',
    '**/*.css' // + CSS
  ].map(function (filename) {
    return destPaths.lib + filename;
  }), injectSrcOptions);

  var appStream = gulp.src([
    destPaths.js + 'templates.js',

    destPaths.js + 'services/*.js',
    destPaths.js + 'controllers/*.js',
    destPaths.js + 'directives/*.js',
    destPaths.js + '**/*.js',
    destPaths.css + '**/*.css' // + CSS
  ], injectSrcOptions);

  return gulp.src(appPaths.index)
    .pipe(inject(series(libStream, appStream), injectOptions))
    .pipe(gulp.dest(destRoot));
});

// ------------------------------------------------------------------------

// copy images
gulp.task('images', function () {
  return gulp.src(appPaths.images)
    .pipe(changed(destPaths.img))
    .pipe(gulp.dest(destPaths.img));
});

// ------------------------------------------------------------------------

gulp.task('clean', function () {
  return del([destRoot + '**']);
});

// ------------------------------------------------------------------------

gulp.task('watch', ['default'], function () {
  gulp.watch(appPaths.styles, ['app-styles']);
  gulp.watch(appPaths.scripts, ['app-scripts']);
  gulp.watch(appPaths.templates, ['templates']);
});

// ------------------------------------------------------------------------

gulp.task('default', ['images', 'styles', 'scripts', 'templates', 'inject']);

// https://forum.ionicframework.com/t/ionic2-cli-doesnt-run-gulp-tasks-on-ionic-serve/49085/7
gulp.task('serve:before', ['watch']);
gulp.task('run:before', ['watch']);
gulp.task('build:before', ['default']);
