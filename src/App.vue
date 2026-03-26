<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="title">健身约课系统</div>
      <nav class="nav">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink v-if="!currentUser" to="/login">登录</RouterLink>
        <RouterLink v-if="!currentUser" to="/register">注册</RouterLink>
        <RouterLink v-if="currentUser" :to="roleToPortalPath(currentUser.role)">工作台</RouterLink>
        <button v-if="currentUser" class="link-btn" @click="handleLogout">退出登录</button>
      </nav>
    </header>
    <main class="page-body">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, RouterLink, RouterView } from "vue-router";
import { clearCurrentUser, getCurrentUser, roleToPortalPath } from "./lib/auth";

const router = useRouter();
const currentUser = computed(() => getCurrentUser());

function handleLogout() {
  clearCurrentUser();
  router.replace("/login");
}
</script>
