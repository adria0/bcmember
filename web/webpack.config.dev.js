const conf = require('./bcregister.conf.js');

const webpack = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: 'eval-cheap-module-source-map',  
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
           use: [
               {
                   loader: 'style-loader',
                   options: {
                      sourceMap: true
                  }
               },
               {
                   // translates CSS into CommonJS
                   loader: "css-loader",
                   options: {
                       sourceMap: true
                   }
               },
               {
                   // compiles Sass to CSS
                   loader: "sass-loader",
                   options: {
                       outputStyle: 'expanded',
                       sourceMap: true,
                       sourceMapContents: true
                   }
               }
           ],
           include: [conf.base]
       },
        {
            test: /\.js$/,
            include: conf.src,
            loader: 'babel-loader'
        }
    ]
  },
  output: {
    filename: 'index_bundle.js',
    path: conf.dist
  },
  plugins: [
      new HtmlWebpackPlugin({
          template: conf.base + '/index.html',
          filename: 'index.html'
      }),
      new CopyWebpackPlugin([
          { from: conf.assets }
      ])
  ]
};
