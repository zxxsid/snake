<template>
  <div class="app">
    <header>
      <h1>🎭 谐音梗大作战 - 题库管理</h1>
    </header>

    <div class="toolbar">
      <button class="btn btn-primary" @click="openAdd">+ 新增题目</button>
      <span class="total">共 {{ total }} 题</span>
    </div>

    <table class="table" v-if="list.length">
      <thead>
        <tr>
          <th>ID</th><th>序号</th><th>图片</th><th>答案</th><th>字数</th><th>分类</th><th>难度</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in list" :key="p.id">
          <td>{{ p.id }}</td>
          <td>{{ p.seq }}</td>
          <td><img v-if="p.riddle_image" :src="p.riddle_image" class="thumb" @click="previewImg = p.riddle_image" /></td>
          <td>{{ p.answer }}</td>
          <td>{{ p.answer_len }}</td>
          <td>{{ p.category }}</td>
          <td>{{ p.difficulty }}</td>
          <td>
            <button class="btn btn-sm" @click="openEdit(p)">编辑</button>
            <button class="btn btn-sm btn-danger" @click="remove(p.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++; load()">下一页</button>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div class="modal-mask" v-if="showModal" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ editId ? '编辑题目' : '新增题目' }}</h3>
        <div class="form-row">
          <label>序号</label>
          <input v-model.number="form.seq" type="number" />
        </div>
        <div class="form-row">
          <label>答案</label>
          <input v-model="form.answer" placeholder="谐音梗答案" />
        </div>
        <div class="form-row">
          <label>分类</label>
          <input v-model="form.category" placeholder="如：动物、食物" />
        </div>
        <div class="form-row">
          <label>难度</label>
          <select v-model.number="form.difficulty">
            <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>谜面图片</label>
          <div class="upload-area">
            <input type="file" accept="image/*" @change="uploadFile" ref="fileInput" />
            <img v-if="form.riddle_image" :src="form.riddle_image" class="preview" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <div class="modal-mask" v-if="previewImg" @click="previewImg = ''">
      <img :src="previewImg" class="preview-full" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

const API = '/api/admin';
const list = ref([]);
const total = ref(0);
const page = ref(1);
const size = 20;
const showModal = ref(false);
const editId = ref(null);
const saving = ref(false);
const previewImg = ref('');

const form = reactive({ seq: 0, answer: '', category: '', difficulty: 1, riddle_image: '' });
const totalPages = computed(() => Math.ceil(total.value / size));

async function load() {
  const res = await fetch(`${API}/puzzles?page=${page.value}&size=${size}`);
  const data = await res.json();
  list.value = data.list || [];
  total.value = data.total || 0;
}

function openAdd() {
  editId.value = null;
  Object.assign(form, { seq: total.value + 1, answer: '', category: '', difficulty: 1, riddle_image: '' });
  showModal.value = true;
}

function openEdit(p) {
  editId.value = p.id;
  Object.assign(form, { seq: p.seq, answer: p.answer, category: p.category, difficulty: p.difficulty, riddle_image: p.riddle_image });
  showModal.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (editId.value) {
      await fetch(`${API}/puzzles?id=${editId.value}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch(`${API}/puzzles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    showModal.value = false;
    load();
  } catch (e) {
    alert('保存失败: ' + e.message);
  } finally {
    saving.value = false;
  }
}

async function remove(id) {
  if (!confirm('确定删除该题目？')) return;
  await fetch(`${API}/puzzles?id=${id}`, { method: 'DELETE' });
  load();
}

async function uploadFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) form.riddle_image = data.url;
    else alert('上传失败');
  } catch (err) {
    alert('上传失败: ' + err.message);
  }
}

onMounted(load);
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; }
.app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 22px; color: #FF6F00; }
.toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.total { color: #888; font-size: 14px; }
.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; background: #e0e0e0; }
.btn-primary { background: #FF6F00; color: #fff; }
.btn-danger { background: #f44336; color: #fff; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.table th { background: #fafafa; font-weight: 600; }
.thumb { width: 50px; height: 100px; object-fit: cover; border-radius: 4px; cursor: pointer; }
.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 16px; }
.pagination button { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: default; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 420px; max-height: 90vh; overflow-y: auto; }
.modal h3 { margin-bottom: 16px; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
.form-row input, .form-row select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
.upload-area { margin-top: 4px; }
.preview { width: 80px; height: 160px; object-fit: cover; border-radius: 6px; margin-top: 8px; }
.preview-full { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
</style>
