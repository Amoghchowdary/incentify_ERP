/* GitHub-safe V12 transport contract test. No private Apps Script code required. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'v12-gateway.js'), 'utf8');
new vm.Script(source, { filename: 'v12-gateway.js' });
for (const protocol of ['INCENTIFY_V12_READY', 'INCENTIFY_V12_ACK', 'INCENTIFY_V12_ACKED', 'INCENTIFY_V12_REQUEST', 'INCENTIFY_V12_RESPONSE']) {
  assert.ok(source.includes(protocol), `Missing gateway protocol message: ${protocol}`);
}

class Port {
  constructor() { this.onmessage = null; this.peer = null; this.closed = false; }
  postMessage(data) {
    if (this.closed) throw new Error('Port closed');
    const target = this.peer;
    queueMicrotask(() => { if (!target.closed && target.onmessage) target.onmessage({ data }); });
  }
  start() {}
  close() { this.closed = true; }
}
function pair() {
  const frontend = new Port(), server = new Port();
  frontend.peer = server; server.peer = frontend;
  return { frontend, server };
}
const listeners = new Map();
const frames = [];
const location = { origin: 'https://amoghchowdary.github.io' };
const windowObj = {
  INCENTIFY_CONFIG: { API_URL: 'https://script.google.com/macros/s/TEST_V12_ENDPOINT/exec' },
  addEventListener(type, handler) { listeners.set(type, handler); },
  removeEventListener(type) { listeners.delete(type); }
};
const document = {
  createElement(tag) {
    assert.equal(tag, 'iframe');
    return { tag, style: {}, setAttribute() {}, remove() {} };
  },
  body: { appendChild(frame) { frames.push(frame); } },
  documentElement: { appendChild(frame) { frames.push(frame); } }
};
const browser = vm.createContext({
  window: windowObj, document, location, URL, setTimeout, clearTimeout,
  crypto: { randomUUID: () => 'abcdef01-2345-6789-abcd-ef0123456789' },
  console, Promise, Map, Error, Math, Date
});
vm.runInContext(source, browser);
const gateway = windowObj.incentifyApi;
assert.ok(gateway, 'Gateway should initialize');
assert.equal(frames.length, 1, 'Gateway should mount exactly one iframe');
const iframeUrl = new URL(frames[0].src);
assert.equal(iframeUrl.origin, 'https://script.google.com');
assert.equal(iframeUrl.searchParams.get('gateway'), '1');
assert.equal(iframeUrl.searchParams.get('origin'), location.origin);
const channel = iframeUrl.searchParams.get('channel');
assert.match(channel, /^[A-Za-z0-9_-]{24,}$/);

function message(origin, data, ports = []) {
  const handler = listeners.get('message');
  assert.equal(typeof handler, 'function');
  handler({ origin, data, ports });
}
(async () => {
  const hostile = pair();
  let hostileAck = false;
  hostile.server.onmessage = () => { hostileAck = true; };
  message('https://evil.example', { type: 'INCENTIFY_V12_READY', channel }, [hostile.frontend]);
  message('https://n-sandbox-script.googleusercontent.com', { type: 'INCENTIFY_V12_READY', channel: 'wrong-channel' }, [hostile.frontend]);
  message('https://n-sandbox-script.googleusercontent.com', { type: 'INCENTIFY_V12_READY', channel }, []);
  await Promise.resolve();
  assert.equal(gateway.ready, false, 'Untrusted/invalid handshake must be rejected');
  assert.equal(hostileAck, false, 'Untrusted port must never receive an ACK');

  const trusted = pair();
  trusted.server.onmessage = ({ data }) => {
    if (data.type === 'INCENTIFY_V12_ACK') {
      assert.equal(data.channel, channel);
      trusted.server.postMessage({ type: 'INCENTIFY_V12_ACKED', channel });
    } else if (data.type === 'INCENTIFY_V12_REQUEST') {
      assert.equal(data.channel, channel);
      if (data.request.action === 'health') {
        trusted.server.postMessage({ type: 'INCENTIFY_V12_RESPONSE', channel, id: data.id, result: { success: true, version: '12.0.0', status: 'ONLINE' } });
      } else if (data.request.action === 'restricted') {
        trusted.server.postMessage({ type: 'INCENTIFY_V12_RESPONSE', channel, id: data.id, result: { success: false, error: 'ACCESS_DENIED', message: 'Permission denied' } });
      }
    }
  };
  message('https://n-sandbox-script.googleusercontent.com', { type: 'INCENTIFY_V12_READY', channel }, [trusted.frontend]);
  await gateway.waitReady(1000);
  assert.equal(gateway.ready, true, 'Valid Google origin and channel must complete handshake');
  const result = await gateway.call('health', {}, 1000);
  assert.equal(result.version, '12.0.0');
  assert.equal(result.status, 'ONLINE');
  await assert.rejects(gateway.call('restricted', {}, 1000), err => err.code === 'ACCESS_DENIED');
  await assert.rejects(gateway.call('silent', {}, 20), /Backend request timed out/);
  assert.equal(gateway.pending.size, 0, 'Completed and timed-out requests must be cleaned up');
  gateway.destroy();
  assert.equal(listeners.has('message'), false, 'Destroy should remove message listener');
  console.log('PASS V12 frontend-only gateway contract: iframe URL, origin/channel checks, port ACK, API response/error, timeout and cleanup.');
  console.log('NOTE Actual INCENTIFY-admin Code.js is tested separately; CI live backend gate remains mandatory.');
})().catch(err => { console.error(err); process.exitCode = 1; });
