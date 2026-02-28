<template>
  <div>
    <h1>💳 订单管理</h1>
    <table>
      <thead><tr><th>ID</th><th>用户ID</th><th>商品</th><th>金额(元)</th><th>钻石</th><th>状态</th><th>时间</th></tr></thead>
      <tbody>
        <tr v-for="o in orders" :key="o.id">
          <td>{{ o.id }}</td><td>{{ o.user_id }}</td><td>{{ o.product_id }}</td>
          <td>{{ (o.amount / 100).toFixed(2) }}</td><td>{{ o.diamond }}</td>
          <td>{{ statusMap[o.status] }}</td><td>{{ formatDate(o.created_at) }}</td>
        </tr>
        <tr v-if="!orders.length"><td colspan="7" style="text-align:center;color:#999">暂无订单</td></tr>
      </tbody>
    </table>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const orders = ref([]);
const statusMap = { 0: '待支付', 1: '已支付', 2: '已发货' };
function formatDate(d) { return d ? new Date(d).toLocaleString() : '-'; }
</script>
