<template>
  <div>
    <h1>👾 怪物管理</h1>
    <table>
      <thead><tr><th>ID</th><th>名称</th><th>等级</th><th>HP</th><th>攻击</th><th>防御</th><th>经验</th><th>金币</th><th>地图</th><th>BOSS</th></tr></thead>
      <tbody>
        <tr v-for="m in monsters" :key="m.id">
          <td>{{ m.id }}</td><td>{{ m.name }}</td><td>{{ m.level }}</td><td>{{ m.hp }}</td>
          <td>{{ m.attack }}</td><td>{{ m.defense }}</td><td>{{ m.exp_reward }}</td>
          <td>{{ m.gold_reward }}</td><td>{{ m.map_id }}</td><td>{{ m.is_boss ? '⭐' : '' }}</td>
        </tr>
        <tr v-if="!monsters.length"><td colspan="10" style="text-align:center;color:#999">暂无数据</td></tr>
      </tbody>
    </table>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const monsters = ref([]);
</script>
