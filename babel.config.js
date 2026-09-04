module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.svg'],
          alias: {
            '@': './src',
            '@features': './src/features',
            '@assets': './assets',
          },
        },
      ],
      // Required by react-native-reanimated 4.x, which react-native-css (and so
      // NativeWind) imports unconditionally. MUST stay last — the worklets
      // plugin has to see the output of every other plugin.
      'react-native-worklets/plugin',
    ],
  };
};

