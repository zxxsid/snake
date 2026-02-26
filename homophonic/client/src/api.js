// HTTP/WebSocket API 客户端

import { CONFIG } from './config.js';

let _token = '';

export function setToken(t) { _token = t; }
export function getToken() { return _token; }

// 通用请求
async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (_token) opts.headers['Authorization'] = 'Bearer ' + _token;
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(CONFIG.API_BASE + path, opts);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || '请求失败');
  return data;
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
  return new WebSocket(url);
}
