'use strict';

const gulp = require('gulp');
const clean = require('gulp-clean');
const del = require('del');

const JSON_FILES = ['./*.json', './**/*.json', '!./node_modules/**', '!./package-lock.json', '!./test/tsconfig.json'];

gulp.task('clean', function () {
    del('./tsconfig.tsbuildinfo');

    return gulp.src('./dist/*', './dist/**/*').pipe(clean());
});

gulp.task('pack', () => {
    return gulp.src([
        'src/index.d.ts'
    ], {
        allowEmpty: true
    }).pipe(gulp.dest('dist'));
});

gulp.task('files', () => {
    return gulp.src([
        'files',
        'templates/**/*',
        'tmp'
    ], {
        allowEmpty: true,
        base: './'
    }).pipe(gulp.dest('dist'));
});

gulp.task('json', () => {
    return gulp.src(JSON_FILES).pipe(gulp.dest('dist'));
});

gulp.task('assets', gulp.series('clean', gulp.parallel('json', done => {
    done();
})));

gulp.task('install', gulp.series('clean', gulp.parallel('json', 'pack', 'files', done => {
    done();
})));

gulp.task('default', gulp.series('install'));