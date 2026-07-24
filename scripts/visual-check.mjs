import { writeFile } from 'node:fs/promises';

const endpoint = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const page = endpoint.find((target) => target.type === 'page');
if (!page) throw new Error('No Chrome page found');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const callback = pending.get(message.id);
  if (callback) {
    pending.delete(message.id);
    callback(message);
  }
});

function command(method, params = {}) {
  const commandId = ++id;
  socket.send(JSON.stringify({ id: commandId, method, params }));
  return new Promise((resolve) => pending.set(commandId, resolve));
}

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await command('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
await new Promise((resolve) => setTimeout(resolve, 600));
await command('Runtime.evaluate', {
  expression: "sessionStorage.setItem('grand-line-vault:mock-session','active')",
});
await command('Page.navigate', { url: 'http://127.0.0.1:5173/collection' });
await new Promise((resolve) => setTimeout(resolve, 3000));
await command('Runtime.evaluate', {
  expression: `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Filtros'))?.click()`,
});
await new Promise((resolve) => setTimeout(resolve, 400));
let capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile('collection-filters-desktop.png', Buffer.from(capture.result.data, 'base64'));

await command('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await command('Page.navigate', { url: 'http://127.0.0.1:5173/collection' });
await new Promise((resolve) => setTimeout(resolve, 2500));
await command('Runtime.evaluate', {
  expression: `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Vista')?.click()`,
});
await new Promise((resolve) => setTimeout(resolve, 400));
capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile('collection-view-mobile.png', Buffer.from(capture.result.data, 'base64'));
socket.close();
