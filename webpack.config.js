const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeThreePlugin = require('@vxna/optimize-three-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    alias: {
      '@three/examples': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm')
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      },
      {
        test: /\.(glb|gltf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/models/[path][name][ext]'
        }
      },
      {
        test: /\.(mp3|wav)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/sounds/[name][ext]'
        }
      },
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'node_modules/three')
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-syntax-dynamic-import']
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Quantum Drift',
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'src/assets',
          to: 'assets'
        }
      ]
    }),
    new OptimizeThreePlugin()
  ],
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            dead_code: true,
            drop_debugger: true,
            pure_funcs: ['console.log']
          },
          mangle: true,
          output: {
            comments: false
          }
        },
        extractComments: false
      })
    ],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `vendor.${packageName.replace('@', '')}`;
          },
          priority: 10,
          reuseExistingChunk: true
        },
        threejs: {
          test: /[\\/]node_modules[\\/]three[\\/]/,
          name: 'vendor.threejs',
          priority: 20,
          enforce: true,
          chunks: 'async'
        },
        commons: {
          name: 'commons',
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxAssetSize: 244000,    // ~240KB
    maxEntrypointSize: 244000 // ~240KB
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  devServer: {
    static: './dist',
    hot: true
  }
}; 