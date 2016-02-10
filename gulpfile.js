'use strict';

/**
 * Dependencies
 */
var fs = require('fs');
var gulp = require('gulp');
let babel = require('gulp-babel');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var filter = require('gulp-filter');
var wrapper = require('gulp-wrapper');
var sourcemaps = require('gulp-sourcemaps');
var ngAnnotate = require('gulp-ng-annotate');

/**
 * Package and configuration
 */
var pkg = require('./package.json');

/*****************************************************************************
 * Helpers
 ***/

/**
 * Get package JSON directly from file system
 */
function packageJson() {
  return (pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8')));
}

/**
 * Get package file name
 */
function packageFileName(filename, ext) {
  if (!ext) {
    ext = filename;
    filename = pkg.name.toLowerCase();
  }
  return filename + (ext || '');
}

/**
 * Generate angular wrapper for module files
 */
function angularWrapper() {
  return {
    header: '(function(window, angular, undefined) {\'use strict\';\n',
    footer: '\n})(window, window.angular);\n'
  };
}

/**
 * Generate banner wrapper for compiled files
 */
function bannerWrapper() {

  //Refresh package JSON
  packageJson();

  //Get date and author
  var today = new Date();
  var date = today.getDate() + '-' + today.getMonth() + '-' + today.getFullYear();
  var author = pkg.author.name + ' <' + pkg.author.email + '>';

  //Format banner
  var banner =
    '/**\n' +
    ' * ' + pkg.name + ' - v' + pkg.version + ' - ' + date + '\n' +
    ' * ' + pkg.homepage + '\n' +
    ' *\n' +
    ' * Copyright (c) ' + today.getFullYear() + ' ' + author + '\n' +
    ' * License: MIT\n' +
    ' */\n';

  //Return wrapper
  return {
    header: banner,
    footer: ''
  };
}

/*****************************************************************************
 * Release task
 ***/

/**
 * Build release files
 */
function release() {
  var jsFilter = filter(['*.js'], {
    restore: true
  });
  return gulp.src([
    'src/**/*.js'
  ]).pipe(ngAnnotate({
    single_quotes: true
  }))
    .pipe(wrapper(angularWrapper()))
    .pipe(sourcemaps.init())
      .pipe(babel({
        compact: false
      }))
      .pipe(concat(packageFileName('.js')))
      .pipe(wrapper(bannerWrapper()))
      .pipe(gulp.dest('release'))
      .pipe(rename(packageFileName('.min.js')))
      .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(jsFilter)
    .pipe(wrapper(bannerWrapper()))
    .pipe(jsFilter.restore)
    .pipe(gulp.dest('release'));
}

/**
 * Build a release version
 */
gulp.task('release', release);
gulp.task('default', release);
