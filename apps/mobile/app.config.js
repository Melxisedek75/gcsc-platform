module.exports = ({ config }) => {
  const local = process.env.GCSC_LOCAL_ANDROID_BUILD === '1';
  return {
    ...config,
    name: local ? 'SmartContractor USB' : config.name,
    plugins: [...(config.plugins ?? []), ['./plugins/with-usb-api.cjs', { enabled: local }]],
  };
};
