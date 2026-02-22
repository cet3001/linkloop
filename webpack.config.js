const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'background/index': './src/background/index.ts',
    'content/index': './src/content/index.ts',
    'popup/index': './src/popup/index.ts',
    'options/index': './src/options/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/index.html', to: 'popup/index.html' },
        { from: 'src/options/index.html', to: 'options/index.html' },
        { from: 'src/assets', to: 'assets' },
        { from: 'src/content/styles.css', to: 'content/styles.css' },
      ],
    }),
  ],
};
