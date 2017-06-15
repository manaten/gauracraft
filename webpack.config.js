module.exports = {
  context: __dirname + '/src',
  entry: {
    'client': './client.js',
  },
  output: {
    path: __dirname + '/public/js/',
    filename: '[name].js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
}
