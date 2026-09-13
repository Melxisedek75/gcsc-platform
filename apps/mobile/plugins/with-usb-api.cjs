const fs = require('node:fs/promises');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const resource = '@xml/gcsc_usb_network_security';
const networkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain>localhost</domain>
    <domain>127.0.0.1</domain>
    <domain>10.0.2.2</domain>
    <domain>::1</domain>
  </domain-config>
</network-security-config>
`;

module.exports = (config, { enabled = false } = {}) => {
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application[0];
    if (enabled) {
      const existing = app.$['android:networkSecurityConfig'];
      if (existing && existing !== resource) throw new Error('Existing network security config must be reconciled.');
      app.$['android:networkSecurityConfig'] = resource;
    } else if (app.$['android:networkSecurityConfig'] === resource) {
      delete app.$['android:networkSecurityConfig'];
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    if (enabled) {
      const dir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'gcsc_usb_network_security.xml'), networkConfig);
    }
    return mod;
  }]);
};
