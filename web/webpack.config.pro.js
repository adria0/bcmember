const conf = require('./bcregister.conf.js');

const webpack = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = {
  entry: [
    conf.src + '/index.js'
  ],
  module: {
    rules: [
        {
          test: /\.js?$/,
          loader: 'eslint-loader',
          include:  conf.src,
          exclude: /node_modules/,
          options: {
              failOnWarning: false,
              failOnError: true
          }
        },
        {
            test: /\.(scss|css)$/,
            use: ExtractTextPlugin.extract({
                use: [
                    'css-loader',
                    'sass-loader'
                ],
                fallback: 'style-loader'
            }),
        },
        {
            test: /\.js$/,
            include: conf.src,
            loader: 'babel-loader'
        }
    ]
  },
  output: {
    filename: 'index.[hash].js',
    path: conf.dist
  },
  plugins: [
      new HtmlWebpackPlugin({
          template: conf.base + '/index.html',
          filename: 'index.html'
      }),
      new CleanWebpackPlugin(conf.dist),
      new ExtractTextPlugin('styles.[contentHash:10].css', {
          allChunks: true
      }),
      new OptimizeCssAssetsPlugin({
          cssProcessor: require('cssnano'), // calls to compress processor 
          cssProcessorOptions: {
              // map: { // only if you want source map, not recomended for production
              //     inline: false,
              // },
              discardComments: {
                  removeAll: true // remove comments
              }
          },
          canPrint: true // shows messages in console or terminal
      }),                  
      new CopyWebpackPlugin([
          { from: conf.assets }
      ]),
      new UglifyJSPlugin({
          // sourceMap: true, // only if you want source map, not recomended for production
          uglifyOptions: {
              output: {
                  comments: false
              }
          }
      }),
      new JavaScriptObfuscator ({
         rotateUnicodeArray: true
      }, [])            
  ]
};
