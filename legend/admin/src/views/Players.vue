<template>
  <div>
    <h1>👥 玩家管理</h1>
    <table>
      <thead><tr><th>ID</th><th>昵称</th><th>职业</th><th>等级</th><th>金币</th><th>钻石</th><th>地图</th><th>注册时间</th></tr></thead>
      <tbody>
        <tr v-for="p in players" :key="p.id">
          <td>{{ p.id }}</td><td>{{ p.nickname }}</td><td>{{ classMap[p.class] || p.class }}</td>
          <td>{{ p.level }}</td><td>{{ p.gold }}</td><td>{{ p.diamond }}</td><td>{{ p.map_id }}</td>
          <td>{{ formatDate(p.created_at) }}</td>
        </tr>
        <tr v-if="!players.length"><td colspan="8" style="text-align:center;color:#999">暂无数据</td></tr>
      </tbody>
    </table>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const players = ref([]);
const classMap = { warrior: '🗡️战士', archer: '🏹弓手', mage: '🔮法师' };
function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '-'; }
</script>
