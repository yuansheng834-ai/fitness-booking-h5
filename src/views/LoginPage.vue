<template>
  <section class="card auth-card">
    <h2>账号登录</h2>
    <p class="muted">当前为免费版快速接入，先使用账号密码登录。</p>

    <form class="form" @submit.prevent="handleSubmit">
      <label>
        <span>账号</span>
        <input v-model.trim="form.username" class="input" placeholder="请输入账号" />
      </label>

      <label>
        <span>密码</span>
        <input v-model.trim="form.password" class="input" type="password" placeholder="请输入密码" />
      </label>

      <button class="primary-btn" :disabled="submitting">{{ submitting ? "登录中..." : "登录" }}</button>
    </form>

    <p class="muted row-tip">
      还没有账号？
      <RouterLink class="link" to="/register">去注册</RouterLink>
    </p>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { ensureDefaultAdmin, loginWithPassword, roleToPortalPath, setCurrentUser } from "../lib/auth";

const router = useRouter();
const submitting = ref(false);
const form = reactive({
  username: "",
  password: ""
});

async function handleSubmit() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await ensureDefaultAdmin();
    const user = await loginWithPassword(form);
    setCurrentUser(user);
    await router.replace(roleToPortalPath(user.role));
  } catch (error) {
    window.alert(error.message || "登录失败");
  } finally {
    submitting.value = false;
  }
}
</script>
