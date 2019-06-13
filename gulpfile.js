const gulp = require('gulp');
const { src, dest, parallel, watch, series } = require('gulp');

const path = require('path');
const gulpSCSS = require('gulp-sass');
const postcssGulp = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const lost = require('lost');
const beautify = require('gulp-jsbeautifier');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const del = require('del');
const PRODUCTION = process.env.NODE_ENV === 'production';

const bluebird = require('bluebird');
bluebird.config({
  warnings: false
});

// helpers
const pkg = require('./package.json');

{
  // Start Fractal
  // ******************************************
  const fractal = require('@frctl/fractal').create();
  fractal.set('project.title', pkg.title); // title for the project
  fractal.web.set('builder.dest', 'build'); // destination for the static export
  fractal.web.set('static.path', __dirname + '/build');
  fractal.docs.set('path', `${__dirname}/docs`); // location of the documentation directory.
  fractal.components.set('path', `${__dirname}/components`); // location of the component directory.
  fractal.components.engine('@frctl/nunjucks'); // use Nunjucks for components
  fractal.components.set('ext', '.nunj');
  // fractal.web.set('static.mount', 'css');
  const logger = fractal.cli.console;

  function fractalStart() {
    const server = fractal.web.server({
      port: 4466,
      sync: true,
      notify: false,
      browser: ['google chrome']
    });
    server.on('error', err => logger.error(err.message));
    return server.start().then(() => {
      logger.success(`Fractal server is now running at ${server.url}`);
    });
  }

  exports.fractalStart = fractalStart;

  // gulp.task('fractal:start', function () {
  //   const server = fractal.web.server({
  //     port: 4466,
  //     sync: true,
  //     notify: false,
  //     browser: ['google chrome'],
  //   });
  //   server.on('error', err => logger.error(err.message));
  //   return server.start().then(() => {
  //     logger.success(`Fractal server is now running at ${server.url}`);
  //   });
  // });

  // gulp.task('fractal:build', function () {
  //   const builder = fractal.web.builder();
  //   builder.on('progress', (completed, total) => logger.update(`Exported ${completed} of ${total} items`, 'info'));
  //   builder.on('error', err => logger.error(err.message));
  //   return builder.build().then(() => {
  //     logger.success('Fractal build completed!');
  //   });
  // });

  function fractalBuild() {
    return function() {
      const builder = fractal.web.builder();
      builder.on('progress', (completed, total) =>
        logger.update(`Exported ${completed} of ${total} items`, 'info')
      );
      builder.on('error', err => logger.error(err.message));
      return builder.build().then(() => {
        logger.success('Fractal build completed!');
      });
    };
  }
  exports.fractalBuild = fractalBuild;
  // End Fractal
  // ******************************************
}

// Start SCSS
// ******************************************
{
  const postCSSConf = [
    lost,
    autoprefixer({ browsers: ['> 2%', 'IE 11', 'iOS >= 7'] })
  ];

  function scss() {
    return src('./src/scss/style.scss')
      .pipe(gulpSCSS())
      .pipe(postcssGulp(postCSSConf))
      .pipe(
        beautify({
          indent_char: ' ',
          indent_size: 2
        })
      )
      .pipe(dest('./build/css/'));
  }

  exports.scss = scss;
}
// END SCSS
// ******************************************

{
  // Copy
  // ******************************************
  function copyStatic() {
    return src('./static/**/*').pipe(dest('./build'));
  }
  exports.copyStatic = copyStatic;

  // End copy
  // ******************************************
}

{
  // SVG sprite
  // ******************************************
  function svgSprite() {
    return src('./src/svg-sprite/*.svg')
      .pipe(
        svgmin(function getOptions(file) {
          let prefix = path.basename(
            file.relative,
            path.extname(file.relative)
          );
          return {
            plugins: [
              {
                cleanupIDs: {
                  prefix: prefix + '-',
                  minify: true
                }
              }
            ]
          };
        })
      )
      .pipe(svgstore())
      .pipe(dest('./build/img'));
  }

  exports.svgSprite = svgSprite;
  // End SVG sprite
  // ******************************************
}

// Watch
// ******************************************
if (!PRODUCTION) {
  watch(
    ['./components/**/*.scss', './src/scss/**/*.scss'],
    { events: ['change', 'add'], delay: 100 },
    scss
  );

  watch(
    ['./src/svg-sprite/*.svg'],
    { events: ['change', 'add'], delay: 100 },
    svgSprite
  );
}

// End Watch
// ******************************************

// Clear directory
// ******************************************
function clearBuildDir() {
  return del(['build/**/*']);
}
exports.clear = clearBuildDir;
// End clear directory
// ******************************************

// Complex tasks
// ******************************************
exports.default = series(parallel(scss, copyStatic, svgSprite), fractalStart);
exports.build = series(
  clearBuildDir,
  parallel(scss, copyStatic, svgSprite),
  fractalBuild
);
// exports.build = series(clearBuildDir, parallel(scss, js, html, copyStatic, copyVendor, copyFonts, copyImg, svgSprite));
