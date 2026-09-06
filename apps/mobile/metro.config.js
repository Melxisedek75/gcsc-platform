const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../../packages')];
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'mjs'])];
module.exports = config;
