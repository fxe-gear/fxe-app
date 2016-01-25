#!/usr/bin/env node

var gulp = require('gulp');
var path  = require('path');

var rootdir = process.argv[2];
var gulpfile = path.join(rootdir, 'gulpfile.js');

require(gulpfile);

process.stdout.write('running gulp:tag-git-head');
gulp.start('tag-git-head');
