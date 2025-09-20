module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['@react-native/babel-preset'],
    // Reanimated plugin must be listed last
    plugins: ['react-native-reanimated/plugin'],
  };
};