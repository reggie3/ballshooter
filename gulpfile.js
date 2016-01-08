/* File: gulpfile.js */

// grab our gulp packages
var gulp = require('gulp'),
  gutil = require('gulp-util'),
  concat = require('gulp-concat'),
  jshint = require('gulp-jshint'),
  clean = require('gulp-clean'),
  uglify = require('gulp-uglify'),
  plumber = require('gulp-plumber'),
  useref = require('gulp-useref'),  //used to replace references to individual js files
  uglifycss = require('gulp-uglifycss'),
  connect = require('gulp-connect'),
  scp = require('gulp-scp2');   //used for deployment to server
  
var secrets = require('./secrets.json');

  
  


//open dev files in server
gulp.task('connectDev', function () {
  connect.server({
    root: ['source'],
    port: 8000,
    livereload: true
  });
});
 
//open dist files in server 
gulp.task('connectDist', function () {
  connect.server({
    root: 'dist',
    port: 8001,
    livereload: true
  });
});

//minimize my js files
gulp.task("minjs", ['clean'], function () {
  gulp.src("./source/myjs/*.js")
    .pipe(plumber())
    .pipe(concat('myjs.js'))
    .pipe(uglify())
    .pipe(gulp.dest("./dist/js/"));

  gulp.src("./source/js/*.js")
    .pipe(plumber())
    .pipe(gulp.dest("./dist/js/"));

  gulp.src("./source/sounds/*.js")
    .pipe(plumber())
    .pipe(uglify())
    .pipe(gulp.dest("./dist/sounds/"));

  gulp.src("./source/models/*.*")
    .pipe(plumber())
    .pipe(gulp.dest("./dist/models/"));

  gulp.src("./source/images/*.png")
    .pipe(plumber())
    .pipe(gulp.dest("./dist/images/"));

  gulp.src("./source/css/*.css")
    .pipe(plumber())
    .pipe(concat('styles.css'))
    .pipe(uglifycss({
      "max-line-len": 80
    }))
    .pipe(gulp.dest("./dist/css/"));

  gulp.src("./source/*.html")
    .pipe(plumber())
    .pipe(useref())
    .pipe(gulp.dest("./dist/"));
});

// configure the jshint task
gulp.task('jshint', function () {
  return gulp.src('./myjs/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

// create a default task and just log a message
gulp.task('default', function () {
  return gutil.log('Gulp is running!')
});

gulp.task('clean', function () {
  return gulp.src(['./dist/*'], { read: false })
    .pipe(clean());
});

gulp.task('builddist', ['clean', 'minjs'], function () {
  console.log("building clean");
});

gulp.task('deploy', function () {
  return gulp.src('./dist/**/*')
    .pipe(plumber())
    .pipe(scp({
      //edit secrets.json file for the following params
      host: secrets.hostname,
      username: secrets.username,
      password: secrets.password,
      dest: secrets.destination
    }))
    .on('error', function (err) {
      console.log(err);
    });
});
