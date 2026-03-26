<template>
  <section class="stack">
    <div class="card">
      <h2>教练课表</h2>
      <p class="muted">点击已预约时段可查看预约详情并处理状态。</p>
    </div>

    <div class="card">
      <div class="day-nav">
        <button class="ghost-btn" :disabled="dayOffset <= 0" @click="handlePrevDay">前一天</button>
        <div class="day-badge">{{ dayMeta.label }}</div>
        <button class="ghost-btn" :disabled="dayOffset >= MAX_DAY_OFFSET" @click="handleNextDay">后一天</button>
      </div>

      <div class="slot-grid">
        <button
          v-for="slot in slots"
          :key="slot.key"
          class="slot-item"
          :class="[`slot-${slot.status}`]"
          @click="handleClickSlot(slot)"
        >
          <span class="slot-time">{{ slot.label }}</span>
          <template v-if="slot.status === 'occupied' && slot.bookingInfo">
            <span class="slot-tag">已被预约</span>
            <span class="slot-member">{{ slot.bookingInfo.member_name }}</span>
          </template>
          <span v-if="slot.status === 'free'" class="slot-tag">可预约</span>
          <span v-if="slot.status === 'past'" class="slot-tag">已过时段</span>
        </button>
      </div>
    </div>
  </section>

  <div v-if="detailVisible" class="modal-mask" @click.self="closeDetails">
    <div class="modal-card">
      <button class="close-x" @click="closeDetails">x</button>
      <h3>预约详情</h3>
      <p class="muted">{{ selectedBooking.date }} {{ selectedBooking.start_time }}-{{ selectedBooking.end_time }}</p>
      <p>会员：{{ selectedBooking.member_name }}</p>
      <p>课程：{{ selectedBooking.course_type }}</p>
      <p>地点：{{ selectedBooking.location }}</p>
      <p v-if="selectedBooking.remark">备注：{{ selectedBooking.remark }}</p>
      <p>状态：{{ selectedBooking.status }}</p>

      <div class="action-row">
        <button v-if="canCancel(selectedBooking.status)" class="ghost-btn" :disabled="actionLoading" @click="handleCancelBooking">
          取消预约
        </button>
        <button
          v-if="canMarkCompleted(selectedBooking.status)"
          class="primary-btn"
          :disabled="actionLoading"
          @click="handleCompleteBooking"
        >
          标记完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { getCurrentUser } from "../lib/auth";
import {
  buildDayMeta,
  buildScheduleSlots,
  canCancel,
  canMarkCompleted,
  cancelBookingByCoach,
  fetchCoachBookingsByDate,
  markBookingCompleted
} from "../lib/coach-booking";

const MAX_DAY_OFFSET = 6;

const coachUser = ref(null);
const dayOffset = ref(0);
const dayBookings = ref([]);
const detailVisible = ref(false);
const actionLoading = ref(false);
const selectedBooking = reactive({});

const dayMeta = computed(() => buildDayMeta(dayOffset.value));
const slots = computed(() =>
  buildScheduleSlots({
    bookings: dayBookings.value,
    memberId: "__none__",
    targetDate: dayMeta.value.date
  })
);

async function initPage() {
  const localUser = getCurrentUser();
  coachUser.value = localUser;
  if (!coachUser.value?.id) return;
  await refreshBookings();
}

async function refreshBookings() {
  if (!coachUser.value?.id) return;
  dayBookings.value = await fetchCoachBookingsByDate(coachUser.value.id, dayMeta.value.dateKey);
}

function handlePrevDay() {
  if (dayOffset.value <= 0) return;
  dayOffset.value -= 1;
  refreshBookings();
}

function handleNextDay() {
  if (dayOffset.value >= MAX_DAY_OFFSET) return;
  dayOffset.value += 1;
  refreshBookings();
}

function handleClickSlot(slot) {
  if (slot.status !== "occupied" || !slot.bookingInfo) return;
  Object.assign(selectedBooking, slot.bookingInfo);
  detailVisible.value = true;
}

function closeDetails() {
  detailVisible.value = false;
}

async function handleCompleteBooking() {
  if (!selectedBooking.id || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await markBookingCompleted(selectedBooking.id);
    await refreshBookings();
    detailVisible.value = false;
    window.alert("已标记为完成");
  } catch (error) {
    window.alert(error.message || "操作失败");
  } finally {
    actionLoading.value = false;
  }
}

async function handleCancelBooking() {
  if (!selectedBooking.id || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await cancelBookingByCoach(selectedBooking);
    await refreshBookings();
    detailVisible.value = false;
    window.alert("已取消预约并返还课时");
  } catch (error) {
    window.alert(error.message || "操作失败");
  } finally {
    actionLoading.value = false;
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

.day-nav {
  display: grid;
  grid-template-columns: 100px 1fr 100px;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.day-badge {
  text-align: center;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-weight: 600;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.slot-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  min-height: 72px;
}

.slot-free {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.slot-occupied {
  border-color: #99f6e4;
  background: #f0fdfa;
}

.slot-past {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #9ca3af;
}

.slot-time {
  display: block;
  font-weight: 600;
}

.slot-tag {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}

.slot-member {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: grid;
  place-items: center;
  z-index: 99;
  padding: 16px;
}

.modal-card {
  position: relative;
  width: min(480px, 100%);
  border-radius: 14px;
  background: #fff;
  padding: 16px;
}

.close-x {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background: #f3f4f6;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
}

.action-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ghost-btn {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  padding: 0 12px;
}
</style>
