<template>
  <div class="admin">
    <nav class="sidebar">
      <h2>🌿 卡通传奇</h2>
      <ul>
        <li v-for="tab in tabs" :key="tab.id" :class="{ active: current === tab.id }" @click="current = tab.id">{{ tab.icon }} {{ tab.label }}</li>
      </ul>
    </nav>
    <main class="content">
      <component :is="currentView" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Dashboard from './views/Dashboard.vue';
import Players from './views/Players.vue';
import Monsters from './views/Monsters.vue';
import Items from './views/Items.vue';
import Maps from './views/Maps.vue';
import Orders from './views/Orders.vue';

const tabs = [
  { id: 'dashboard', label: '概览', icon: '📊' },
  { id: 'players', label: '玩家', icon: '👥' },
  { id: 'monsters', label: '怪物', icon: '👾' },
  { id: 'items', label: '物品', icon: '🗡️' },
  { id: 'maps', label: '地图', icon: '🗺️' },
  { id: 'orders', label: '订单', icon: '💳' },
];
const current = ref('dashboard');
const views = { dashboard: Dashboard, players: Players, monsters: Monsters, items: Items, maps: Maps, orders: Orders };
const currentView = computed(() => views[current.value] || Dashboard);
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f0f2f5; color: #333; }
.admin { display: flex; min-height: 100vh; }
.sidebar { width: 200px; background: #1a3a1a; color: #fff; padding: 20px 0; }
.sidebar h2 { text-align: center; font-size: 18px; margin-bottom: 24px; color: #FFD54F; }
.sidebar ul { list-style: none; }
.sidebar li { padding: 12px 24px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
.sidebar li:hover { background: rgba(255,255,255,0.1); }
.sidebar li.active { background: rgba(255,255,255,0.15); border-left: 3px solid #FFD54F; }
.content { flex: 1; padding: 24px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 16px; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
th { background: #fafafa; font-weight: 600; }
.card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 140px; background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
.stat-card .num { font-size: 28px; font-weight: bold; color: #FF8F00; }
.stat-card .label { font-size: 13px; color: #888; margin-top: 4px; }
</style>
