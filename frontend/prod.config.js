const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./common.config.js');

module.exports = env => merge(common(env), {
  mode: 'production',
});