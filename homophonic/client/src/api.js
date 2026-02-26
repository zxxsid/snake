// HTTP/WebSocket API 客户端
// 兼容浏览器 fetch 和微信 wx.request

import { CONFIG } from './config.js';

const isWx = typeof wx !== 'undefined' && typeof wx.request === 'function';

let _token = '';

export function setToken(t) { _token = t; }
export function getToken() { return _token; }

// 通用请求（自动选择 fetch 或 wx.request）
function request(method, path, body) {
  const url = CONFIG.API_BASE + path;
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;

  if (isWx) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method,
        header: headers,
        data: body || {},
        dataType: 'json',
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error((res.data && res.data.error) || '请求失败'));
          }
        },
        fail(err) {
          reject(new Error(err.errMsg || '网络错误'));
        },
      });
    });
  }

  // 浏览器 fetch
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts).then(resp => {
    return resp.json().then(data => {
      if (!resp.ok) throw new Error(data.error || '请求失败');
      return data;
    });
  });
}

// --- 用户 ---
export async function login(code, nickname, avatar) {
  const data = await request('POST', '/api/login', { code, nickname, avatar });
  _token = data.token;
  return data;
}

// --- 闯关 ---
export function getPuzzle(seq) { return request('GET', `/api/puzzle?seq=${seq}`); }
export function checkAnswer(seq, answer) { return request('POST', '/api/answer', { seq, answer }); }
export function getHint(seq) { return request('GET', `/api/hint?seq=${seq}`); }
export function getFullAnswer(seq) { return request('GET', `/api/answer?seq=${seq}`); }

// --- 竞技 ---
export function createRoom() { return request('POST', '/api/room/create'); }
export function joinRoom(roomID) { return request('POST', '/api/room/join', { room_id: roomID }); }

// --- WebSocket ---
export function connectWS(roomID) {
  const url = `${CONFIG.WS_BASE}/ws?room_id=${roomID}&token=${_token}`;

  if (isWx) {
    // 微信 WebSocket 适配：包装为类似浏览器 WebSocket 的接口
    const sock = {
      onmessage: null,
      onclose: null,
      onopen: null,
      _task: null,
      send(data) { if (this._task) this._task.send({ data }); },
      close() { if (this._task) this._task.close(); },
    };
    sock._task = wx.connectSocket({ url, header: { Authorization: 'Bearer ' + _token } });
    sock._task.onOpen(() => { if (sock.onopen) sock.onopen(); });
    sock._task.onMessage(res => { if (sock.onmessage) sock.onmessage({ data: res.data }); });
    sock._task.onClose(() => { if (sock.onclose) sock.onclose(); });
    sock._task.onError(() => { if (sock.onclose) sock.onclose(); });
    return sock;
  }

  return new WebSocket(url);
}
