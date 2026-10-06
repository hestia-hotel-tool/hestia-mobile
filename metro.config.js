const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Fix: Supabase realtime-js requires tslib - ensure Metro resolves it
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  tslib: path.resolve(__dirname, 'node_modules/tslib'),
};

// Support importing .svg files as React components (react-native-svg-transformer)
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = withNativewind(config, {
  // inline variables break PlatformColor in CSS variables
  inlineVariables: false,
  // We add className support manually
  globalClassNamePolyfill: false,
});
