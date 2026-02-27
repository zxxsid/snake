import { CONFIG } from './config.js';
const isWx = typeof wx !== 'undefined' && typeof wx.request === 'function';
let _token = '';
export function setToken(t) { _token = t; }
export function getToken() { return _token; }

function request(method, path, body) {
  const url = CONFIG.API_BASE + path;
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  if (isWx) {
    return new Promise((resolve, reject) => {
      wx.request({ url, method, header: headers, data: body || {}, dataType: 'json',
        success(r) { r.statusCode < 300 ? resolve(r.data) : reject(new Error(r.data?.error || '请求失败')); },
        fail(e) { reject(new Error(e.errMsg || '网络错误')); } });
    });
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts).then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error); return d; }));
}

export function login(code, nick, avatar) { return request('POST', '/api/login', { code, nickname: nick, avatar }).then(d => { _token = d.token; return d; }); }
export function createRoom() { return request('POST', '/api/room/create'); }

export function connectWS(roomID) {
  const url = `${CONFIG.WS_BASE}/ws?room_id=${roomID}&token=${_token}`;
  if (isWx) {
    const sock = { onmessage: null, onclose: null, _t: null,
      send(d) { if (this._t) this._t.send({ data: typeof d === 'string' ? d : JSON.stringify(d) }); },
      close() { if (this._t) this._t.close(); } };
    sock._t = wx.connectSocket({ url, header: { Authorization: 'Bearer ' + _token } });
    sock._t.onMessage(r => { if (sock.onmessage) sock.onmessage({ data: r.data }); });
    sock._t.onClose(() => { if (sock.onclose) sock.onclose(); });
    sock._t.onError(() => { if (sock.onclose) sock.onclose(); });
    return sock;
  }
  return new WebSocket(url);
}
