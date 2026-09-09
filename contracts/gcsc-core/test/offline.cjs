const deny = () => { throw new Error('Network disabled for local contract tests'); };
globalThis.fetch = deny;
for (const moduleName of ['node:http', 'node:https']) {
  const module = require(moduleName);
  module.request = deny;
  module.get = deny;
}
const net = require('node:net');
net.connect = net.createConnection = net.Socket.prototype.connect = deny;
require('node:tls').connect = deny;
require('node:dgram').Socket.prototype.send = deny;
