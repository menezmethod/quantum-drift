const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
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
    })
  ],
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Get the name of the npm package
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            // Use @ symbol for scoped packages
            return `vendor.${packageName.replace('@', '')}`;
          },
          priority: 10
        },
        threejs: {
          test: /[\\/]node_modules[\\/]three[\\/]/,
          name: 'vendor.threejs',
          priority: 20
        }
      }
    }
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 2000000,    // 2MB
    maxEntrypointSize: 1000000 // 1MB
  },
  devtool: 'source-map',
  devServer: {
    static: './dist',
    hot: true
  }
}; 