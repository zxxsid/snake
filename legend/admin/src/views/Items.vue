<template>
  <div>
    <h1>🗡️ 物品管理</h1>
    <table>
      <thead><tr><th>ID</th><th>名称</th><th>类型</th><th>品质</th><th>等级</th><th>攻击</th><th>防御</th><th>HP</th><th>购买价</th></tr></thead>
      <tbody>
        <tr v-for="it in items" :key="it.id">
          <td>{{ it.id }}</td><td :style="{ color: qColor[it.quality] }">{{ it.name }}</td>
          <td>{{ it.type }}</td><td>{{ qName[it.quality] }}</td><td>{{ it.level_req }}</td>
          <td>{{ it.base_attack || '-' }}</td><td>{{ it.base_defense || '-' }}</td>
          <td>{{ it.base_hp || '-' }}</td><td>{{ it.buy_price || '-' }}</td>
        </tr>
        <tr v-if="!items.length"><td colspan="9" style="text-align:center;color:#999">暂无数据</td></tr>
      </tbody>
    </table>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const items = ref([]);
const qColor = { white: '#999', green: '#4CAF50', blue: '#2196F3', purple: '#9C27B0', orange: '#FF9800', red: '#F44336' };
const qName = { white: '普通', green: '优秀', blue: '精良', purple: '史诗', orange: '传说', red: '神话' };
</script>
