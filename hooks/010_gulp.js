#!/usr/bin/env node

var gulp = require('gulp');

require('../gulpfile.js');

gulp.start(['tag-git-head', 'default']);
