<template>
  <div>
    <h1>🗺️ 地图管理</h1>
    <table>
      <thead><tr><th>ID</th><th>名称</th><th>等级范围</th><th>尺寸</th><th>主题</th><th>安全区</th></tr></thead>
      <tbody>
        <tr v-for="m in maps" :key="m.id">
          <td>{{ m.id }}</td><td>{{ m.name }}</td><td>{{ m.level_min }}-{{ m.level_max }}</td>
          <td>{{ m.width }}×{{ m.height }}</td><td>{{ m.theme }}</td>
          <td>({{ m.safe_x }},{{ m.safe_y }}) r={{ m.safe_r }}</td>
        </tr>
        <tr v-if="!maps.length"><td colspan="6" style="text-align:center;color:#999">暂无数据</td></tr>
      </tbody>
    </table>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const maps = ref([]);
</script>
