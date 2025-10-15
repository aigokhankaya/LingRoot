module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['@react-native/babel-preset'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      }],
      // Reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};