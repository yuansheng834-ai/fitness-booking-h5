<template>
  <section class="stack">
    <div class="card">
      <h2>管理员课表总览</h2>
      <p class="muted">查看各教练预约课表，点击已预约时段可看预约详情。</p>
    </div>

    <div class="card">
      <div class="coach-row">
        <button
          v-for="coach in coaches"
          :key="coach.id"
          class="coach-chip"
          :class="{ active: coach.id === selectedCoachId }"
          @click="handleSelectCoach(coach.id)"
        >
          {{ coach.nickname }}
        </button>
      </div>
      <p v-if="!coaches.length" class="muted">当前还没有教练账号。</p>
    </div>

    <div v-if="selectedCoachId" class="card">
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

    <div class="card user-entry">
      <div class="row">
        <div>
          <h3 class="entry-title">用户账号管理</h3>
          <p class="muted">处理身份、课时和当天取消机会。</p>
        </div>
        <RouterLink class="primary-btn entry-btn" to="/portal/admin/users">进入</RouterLink>
      </div>
    </div>
  </section>

  <div v-if="detailVisible" class="modal-mask" @click.self="closeDetails">
    <div class="modal-card">
      <button class="close-x" @click="closeDetails">x</button>
      <h3>预约详情</h3>
      <p class="muted">{{ selectedBooking.date }} {{ selectedBooking.start_time }}-{{ selectedBooking.end_time }}</p>
      <p>教练：{{ selectedBooking.coach_name }}</p>
      <p>会员：{{ selectedBooking.member_name }}</p>
      <p>课程：{{ selectedBooking.course_type }}</p>
      <p>地点：{{ selectedBooking.location }}</p>
      <p v-if="selectedBooking.remark">备注：{{ selectedBooking.remark }}</p>
      <p>状态：{{ selectedBooking.status }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  buildDayMeta,
  buildScheduleSlots,
  fetchCoachBookingsByDate,
  fetchCoaches
} from "../lib/admin-portal";

const MAX_DAY_OFFSET = 6;

const coaches = ref([]);
const selectedCoachId = ref("");
const dayOffset = ref(0);
const dayBookings = ref([]);
const detailVisible = ref(false);
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
  coaches.value = await fetchCoaches();
  if (coaches.value.length > 0) {
    selectedCoachId.value = coaches.value[0].id;
    await refreshBookings();
  }
}

async function refreshBookings() {
  if (!selectedCoachId.value) return;
  dayBookings.value = await fetchCoachBookingsByDate(selectedCoachId.value, dayMeta.value.dateKey);
}

function handleSelectCoach(coachId) {
  selectedCoachId.value = coachId;
  refreshBookings();
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

.coach-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.coach-chip {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
}

.coach-chip.active {
  background: #111827;
  color: #fff;
  border-color: #111827;
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
  border-color: #c4b5fd;
  background: #f5f3ff;
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

.user-entry .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.entry-title {
  margin: 0;
  font-size: 18px;
}

.entry-btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
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

.ghost-btn {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  padding: 0 12px;
}
</style>
