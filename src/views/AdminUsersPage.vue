<template>
  <section class="stack">
    <div class="card">
      <h2>用户账号管理</h2>
      <p class="muted">支持搜索、筛选，并处理会员身份与课时。</p>
    </div>

    <div class="card">
      <div class="toolbar">
        <input v-model.trim="keyword" class="input" placeholder="搜索昵称或账号" />
        <button class="ghost-btn" @click="keyword = ''">清空</button>
      </div>

      <div class="filter-row">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-chip"
          :class="{ active: roleFilter === tab.value }"
          @click="roleFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="card">
      <div v-if="filteredUsers.length" class="list">
        <article v-for="user in filteredUsers" :key="user.id" class="item">
          <div class="item-main">
            <h3>{{ user.nickname }}</h3>
            <p class="muted">账号：{{ user.username }}</p>
            <p class="muted">身份：{{ user.roleText }}</p>
            <p v-if="user.role === 'member'" class="muted">可用课时：{{ user.available_credits }}</p>
            <p v-if="user.role === 'member'" class="muted">本月当天取消机会：{{ user.cancelSummaryText }}</p>
          </div>

          <div class="actions">
            <button v-if="user.role === 'member'" class="ghost-btn" @click="handlePromote(user)">设为教练</button>
            <button v-if="user.role === 'member'" class="ghost-btn" @click="handleAddCredits(user)">增加课时</button>
            <button v-if="user.role === 'member'" class="ghost-btn" @click="handleReduceCredits(user)">减少课时</button>
            <button v-if="user.role === 'member'" class="ghost-btn" @click="handleAddCancelChance(user)">+1 当天取消机会</button>
          </div>
        </article>
      </div>
      <p v-else class="muted">当前筛选下没有可管理用户。</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import {
  addSameDayCancelChance,
  changeMemberCredits,
  fetchManageableUsers,
  mapUserView,
  promoteMemberToCoach
} from "../lib/admin-portal";

const users = ref([]);
const keyword = ref("");
const roleFilter = ref("all");

const filterTabs = [
  { value: "all", label: "全部" },
  { value: "member", label: "会员" },
  { value: "coach", label: "教练" }
];

const filteredUsers = computed(() => {
  const q = keyword.value.toLowerCase();
  return users.value.filter((user) => {
    const roleMatch = roleFilter.value === "all" ? true : user.role === roleFilter.value;
    if (!roleMatch) return false;
    if (!q) return true;
    return user.nickname.toLowerCase().includes(q) || user.username.toLowerCase().includes(q);
  });
});

async function loadUsers() {
  const raw = await fetchManageableUsers();
  users.value = raw.map((item) => mapUserView(item));
}

async function handlePromote(user) {
  try {
    await promoteMemberToCoach(user.id);
    await loadUsers();
    window.alert("已设为教练");
  } catch (error) {
    window.alert(error.message || "操作失败");
  }
}

async function handleAddCredits(user) {
  const raw = window.prompt("请输入要增加的课时数", "1");
  if (!raw) return;
  const count = Number(raw);
  if (!Number.isFinite(count) || count <= 0) {
    window.alert("请输入有效数字");
    return;
  }
  try {
    await changeMemberCredits(user.id, count);
    await loadUsers();
    window.alert("课时已增加");
  } catch (error) {
    window.alert(error.message || "操作失败");
  }
}

async function handleReduceCredits(user) {
  const raw = window.prompt("请输入要减少的课时数", "1");
  if (!raw) return;
  const count = Number(raw);
  if (!Number.isFinite(count) || count <= 0) {
    window.alert("请输入有效数字");
    return;
  }
  try {
    await changeMemberCredits(user.id, -count);
    await loadUsers();
    window.alert("课时已减少");
  } catch (error) {
    window.alert(error.message || "操作失败");
  }
}

async function handleAddCancelChance(user) {
  try {
    await addSameDayCancelChance(user.id);
    await loadUsers();
    window.alert("已增加 1 次当天取消机会");
  } catch (error) {
    window.alert(error.message || "操作失败");
  }
}

onMounted(() => {
  loadUsers().catch((error) => {
    window.alert(error.message || "页面初始化失败");
  });
});
</script>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.input {
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.filter-chip {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  padding: 7px 12px;
  cursor: pointer;
}

.filter-chip.active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.list {
  display: grid;
  gap: 10px;
}

.item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.item-main h3 {
  margin: 0 0 6px;
}

.item-main p {
  margin: 0;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ghost-btn {
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  padding: 0 10px;
}
</style>
