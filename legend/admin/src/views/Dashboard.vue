<template>
  <div>
    <h1>📊 概览</h1>
    <div class="stats">
      <div class="stat-card"><div class="num">{{ stats.users }}</div><div class="label">注册玩家</div></div>
      <div class="stat-card"><div class="num">{{ stats.online }}</div><div class="label">在线玩家</div></div>
      <div class="stat-card"><div class="num">{{ stats.monsters }}</div><div class="label">怪物种类</div></div>
      <div class="stat-card"><div class="num">{{ stats.items }}</div><div class="label">物品种类</div></div>
      <div class="stat-card"><div class="num">{{ stats.orders }}</div><div class="label">今日订单</div></div>
      <div class="stat-card"><div class="num">¥{{ stats.revenue }}</div><div class="label">今日收入</div></div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const stats = ref({ users: 0, online: 0, monsters: 6, items: 13, orders: 0, revenue: 0 });
</script>
