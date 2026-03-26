<template>
  <section class="card auth-card">
    <h2>会员注册</h2>
    <p class="muted">普通用户注册后默认创建为会员身份。</p>

    <form class="form" @submit.prevent="handleSubmit">
      <label>
        <span>昵称</span>
        <input v-model.trim="form.nickname" class="input" placeholder="请输入昵称" />
      </label>

      <label>
        <span>账号</span>
        <input v-model.trim="form.username" class="input" placeholder="请输入账号" />
      </label>

      <label>
        <span>密码</span>
        <input v-model.trim="form.password" class="input" type="password" placeholder="请输入密码" />
      </label>

      <button class="primary-btn" :disabled="submitting">{{ submitting ? "提交中..." : "注册并登录" }}</button>
    </form>

    <p class="muted row-tip">
      已有账号？
      <RouterLink class="link" to="/login">去登录</RouterLink>
    </p>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { registerMember, roleToPortalPath, setCurrentUser } from "../lib/auth";

const router = useRouter();
const submitting = ref(false);
const form = reactive({
  nickname: "",
  username: "",
  password: ""
});

async function handleSubmit() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const user = await registerMember(form);
    setCurrentUser(user);
    await router.replace(roleToPortalPath(user.role));
  } catch (error) {
    window.alert(error.message || "注册失败");
  } finally {
    submitting.value = false;
  }
}
</script>
