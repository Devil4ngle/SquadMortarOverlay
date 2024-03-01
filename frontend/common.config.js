const path = require('path');
const webpack = require('webpack');

module.exports = env => {
  return ({
  entry: './src/main.ts',
  //mode: "production",
  plugins: [
    new webpack.DefinePlugin({
      'process.env.mode': JSON.stringify(env.NODE_ENV || 'production')
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    filename: "app.js",
    compress: true,
    port: 8000,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'public'),
  },
});}