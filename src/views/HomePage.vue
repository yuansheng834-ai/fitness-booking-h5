<template>
  <section class="card">
    <h2>欢迎使用健身约课系统</h2>
    <p class="muted">请先登录或注册，系统会根据你的身份自动进入对应工作台。</p>

    <div class="entry-grid">
      <RouterLink class="entry-card" to="/login">
        <h3>登录</h3>
        <p>已有账号，直接登录使用。</p>
      </RouterLink>

      <RouterLink class="entry-card" to="/register">
        <h3>注册</h3>
        <p>新用户注册后默认成为会员。</p>
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
