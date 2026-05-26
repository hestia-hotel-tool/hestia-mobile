module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@app': './src/app',
            '@features': './src/features',
            '@shared': './src/shared',
            '@components': './src/components',
            '@screens': './src/screens',
            '@theme': './src/theme',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@config': './src/config',
            '@types': './src/types',
            '@data': './src/data',
            '@constants': './src/constants',
          },
        },
      ],
    ],
  };
};

