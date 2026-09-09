const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = (_, argv) => ({
  entry: "./src/index.js",
  output: {
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  module: { rules: [{ test: /\.css$/, use: ["style-loader", "css-loader"] }] },
  plugins: [
    new HtmlWebpackPlugin({ template: "./src/index.html" }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/assets/models", to: "assets/models" },
        { from: "src/assets/sounds", to: "assets/sounds" },
      ],
    }),
  ],
  optimization: { splitChunks: { chunks: "all" } },
  performance: { hints: false },
  devtool: argv.mode === "production" ? false : "eval-source-map",
  devServer: {
    host: "0.0.0.0",
    port: 8080,
    hot: false,
    proxy: {
      "/socket.io": { target: "http://127.0.0.1:3000", ws: true },
      "/health": "http://127.0.0.1:3000",
    },
  },
});
