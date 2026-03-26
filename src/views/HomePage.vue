<template>
  <section class="card">
    <h2>H5 迁移已可用</h2>
    <p class="muted">小程序代码已保留不变，H5 端已完成账号体系与三角色入口。</p>

    <div class="entry-grid">
      <RouterLink class="entry-card" to="/register">
        <h3>/register</h3>
        <p>会员注册</p>
      </RouterLink>

      <RouterLink class="entry-card" to="/login">
        <h3>/login</h3>
        <p>账号登录</p>
      </RouterLink>

      <RouterLink class="entry-card" to="/portal/member">
        <h3>/portal/member</h3>
        <p>会员工作台</p>
      </RouterLink>

      <RouterLink class="entry-card" to="/portal/coach">
        <h3>/portal/coach</h3>
        <p>教练工作台</p>
      </RouterLink>

      <RouterLink class="entry-card" to="/portal/admin">
        <h3>/portal/admin</h3>
        <p>管理员工作台</p>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router";
</script>

<style scoped>
.entry-grid {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.entry-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  text-decoration: none;
  color: #111827;
}

.entry-card h3 {
  margin: 0 0 6px;
  font-size: 15px;
}

.entry-card p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}
</style>
