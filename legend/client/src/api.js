// HTTP/WebSocket 客户端（兼容浏览器和微信小游戏）
import { CONFIG } from './config.js';
const isWx = typeof wx !== 'undefined' && typeof wx.request === 'function';
let _token = '';
export function setToken(t) { _token = t; }
export function getToken() { return _token; }

// 通用请求
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

// --- API ---
export function login(code, nick, avatar) {
  return request('POST', '/api/login', { code, nickname: nick, avatar }).then(d => { _token = d.token; return d; });
}
export function bindPhone(code) { return request('POST', '/api/bind-phone', { code }); }
export function selectClass(cls) { return request('POST', '/api/select-class', { class: cls }); }
export function getGameData() { return request('GET', '/api/game-data'); }

// WebSocket
export function connectWS() {
  const url = `${CONFIG.WS_BASE}/ws?token=${_token}`;
  if (isWx) {
    const s = { onmessage: null, onclose: null, _t: null,
      send(d) { if (this._t) this._t.send({ data: typeof d === 'string' ? d : JSON.stringify(d) }); },
      close() { if (this._t) this._t.close(); } };
    s._t = wx.connectSocket({ url, header: { Authorization: 'Bearer ' + _token } });
    s._t.onMessage(r => { if (s.onmessage) s.onmessage({ data: r.data }); });
    s._t.onClose(() => { if (s.onclose) s.onclose(); });
    return s;
  }
  return new WebSocket(url);
}
