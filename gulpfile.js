var gulp = require('gulp');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var mainBowerFiles = require('main-bower-files');
var inject = require('gulp-inject');
var order = require('gulp-order');
var filter = require('gulp-filter');

var paths = {
  styles: ['./scss/**/*.scss', './scss/**/*.css'],
  scripts: ['./app/**/*.js', './app/*.js'],
};

gulp.task('bower-files', function(done) {
  gulp.src(mainBowerFiles())
  .pipe(gulp.dest('./www/lib'))
  .on('end', done);
});

gulp.task('styles', function(done) {
  gulp.src(paths.styles)
  .pipe(sass())
  .pipe(minifyCss({
    keepSpecialComments: 0,
  }))
  .pipe(concat('style.min.css'))
  .pipe(gulp.dest('./www/css/'));
});

gulp.task('scripts', function(done) {
  gulp.src(paths.scripts)
  .pipe(concat('app.js'))
  .pipe(gulp.dest('./www/js'))
  .on('end', done);
});

gulp.task('index', function(done) {
  gulp.src('./www/index.html')
  .pipe(inject(
    gulp.src([
      './www/lib/**/*.js',
      './www/lib/**/*.css',
    ], {read: false})
    .pipe(order([
      'angular.js',
      'Chart.js',
      'angular*.js',
      'ionic.js',
      'ionic*.js',
      'ng*.js',
      'stacktrace.min.js',
      'stack*.js',
    ]))
    .pipe(filter([
      '*',
      '!*source-map.js',
    ])),
    {relative: true}
  ))
  .pipe(gulp.dest('./www'))
  .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.styles, ['styles']);
  gulp.watch(paths.scripts, ['bower-files', 'scripts']);
});

gulp.task('default', ['bower-files', 'scripts', 'styles', 'index']);
