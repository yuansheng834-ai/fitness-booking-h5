<template>
  <section class="stack">
    <div class="card member-nav">
      <RouterLink class="nav-pill" to="/portal/member">首页</RouterLink>
      <RouterLink class="nav-pill nav-pill-active" to="/portal/member/me">我的</RouterLink>
    </div>

    <div class="card">
      <h2>会员信息</h2>
      <p class="muted">昵称：{{ currentUser?.nickname || "-" }}</p>
      <p class="muted">剩余课时：{{ currentUser?.available_credits ?? 0 }}</p>
    </div>

    <div class="card">
      <div class="row-header">
        <h3 class="section-title">历史预约</h3>
        <RouterLink class="ghost-link" to="/portal/member">返回约课首页</RouterLink>
      </div>
      <div class="tab-row">
        <button
          v-for="tab in STATUS_TABS"
          :key="tab.value"
          class="tab-chip"
          :class="{ active: statusFilter === tab.value }"
          @click="statusFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="filteredBookings.length" class="list">
        <article v-for="item in filteredBookings" :key="item.id" class="item">
          <h4>{{ item.date }} {{ item.start_time }}-{{ item.end_time }}</h4>
          <p class="muted">教练：{{ item.coach_name }}</p>
          <p class="muted">课程：{{ item.course_type }}</p>
          <p class="muted">地点：{{ item.location }}</p>
          <p class="muted">状态：{{ item.status }}</p>
          <p v-if="item.remark" class="muted">备注：{{ item.remark }}</p>
        </article>
      </div>
      <p v-else class="muted">当前筛选下暂无预约记录。</p>
    </div>

    <div class="card">
      <h3 class="section-title">课时流水</h3>
      <div class="month-row">
        <label>
          <span class="muted">月份</span>
          <select v-model="selectedMonth" class="input">
            <option v-for="month in monthOptions" :key="month" :value="month">{{ month }}</option>
          </select>
        </label>
      </div>

      <div v-if="filteredLogs.length" class="list">
        <article v-for="item in filteredLogs" :key="item.id" class="item">
          <h4 :class="item.change_amount > 0 ? 'plus' : 'minus'">
            {{ item.change_amount > 0 ? "+" : "" }}{{ item.change_amount }}
          </h4>
          <p class="muted">原因：{{ item.reason }}</p>
          <p class="muted">变动后课时：{{ item.balance_after }}</p>
          <p class="muted">时间：{{ item.created_at }}</p>
        </article>
      </div>
      <p v-else class="muted">该月份暂无课时变动记录。</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getCurrentUser, setCurrentUser } from "../lib/auth";
import { fetchCurrentUser } from "../lib/member-booking";
import {
  STATUS_TABS,
  buildMonthOptionsFromLogs,
  fetchMemberBookings,
  fetchMemberCreditLogs,
  monthBounds,
  monthKeyFromDate
} from "../lib/member-me";

const currentUser = ref(null);
const bookings = ref([]);
const creditLogs = ref([]);
const statusFilter = ref("all");
const monthOptions = ref([]);
const selectedMonth = ref(monthKeyFromDate(new Date()));

const filteredBookings = computed(() => {
  if (statusFilter.value === "all") return bookings.value;
  return bookings.value.filter((item) => item.status === statusFilter.value);
});

const filteredLogs = computed(() => {
  if (!selectedMonth.value) return creditLogs.value;
  const { from, to } = monthBounds(selectedMonth.value);
  return creditLogs.value.filter((item) => item.created_at >= from && item.created_at < to);
});

async function initPage() {
  const localUser = getCurrentUser();
  if (!localUser?.id) return;

  currentUser.value = await fetchCurrentUser(localUser.id);
  setCurrentUser(currentUser.value);

  const [bookingRows, logRows] = await Promise.all([
    fetchMemberBookings(currentUser.value.id),
    fetchMemberCreditLogs(currentUser.value.id)
  ]);

  bookings.value = bookingRows;
  creditLogs.value = logRows;
  monthOptions.value = buildMonthOptionsFromLogs(logRows);
  if (!monthOptions.value.includes(selectedMonth.value)) {
    selectedMonth.value = monthOptions.value[0] || monthKeyFromDate(new Date());
  }
}

onMounted(() => {
  initPage().catch((error) => {
    window.alert(error.message || "页面初始化失败");
  });
});
</script>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
}

.member-nav {
  display: flex;
  gap: 8px;
}

.nav-pill {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  text-decoration: none;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-pill-active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 18px;
}

.ghost-link {
  font-size: 14px;
  color: #2563eb;
}

.tab-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.tab-chip {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  padding: 7px 12px;
  cursor: pointer;
}

.tab-chip.active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.month-row {
  margin-top: 10px;
}

.month-row label {
  display: grid;
  gap: 6px;
}

.input {
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 10px;
}

.list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
}

.item h4 {
  margin: 0 0 6px;
}

.item p {
  margin: 0;
}

.plus {
  color: #15803d;
}

.minus {
  color: #b91c1c;
}
</style>
