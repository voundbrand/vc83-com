module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui babel plugin removed - it requires web dependencies
      // Tamagui works fine without it, just no compile-time optimizations
      'react-native-reanimated/plugin',
    ],
  };
};
