<template>
  <section class="stack">
    <div class="card member-nav">
      <RouterLink class="nav-pill nav-pill-active" to="/portal/member">首页</RouterLink>
      <RouterLink class="nav-pill" to="/portal/member/me">我的</RouterLink>
    </div>

    <div class="card">
      <h2>会员约课</h2>
      <p class="muted">剩余课时：{{ currentUser?.available_credits ?? 0 }}</p>
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
          v-for="(slot, index) in slots"
          :key="slot.key"
          class="slot-item"
          :class="[`slot-${slot.status}`]"
          @click="handleClickSlot(slot, index)"
        >
          <span class="slot-time">{{ slot.label }}</span>
          <span v-if="slot.status === 'mine'" class="slot-tag">我的预约</span>
          <span v-if="slot.status === 'occupied'" class="slot-tag">已被预约</span>
          <span v-if="slot.status === 'past'" class="slot-tag">已过时段</span>
        </button>
      </div>
    </div>
  </section>

  <div v-if="bookingModalVisible" class="modal-mask" @click.self="closeBookingModal">
    <div class="modal-card">
      <h3>确认预约</h3>
      <p class="muted">{{ dayMeta.dateKey }} {{ bookingPreview.start }}-{{ bookingPreview.end }}</p>

      <label class="form-label">
        <span>约课种类</span>
        <select v-model="bookingForm.courseType" class="input">
          <option value="">请选择</option>
          <option v-for="type in COURSE_TYPES" :key="type" :value="type">{{ type }}</option>
        </select>
      </label>

      <label class="form-label">
        <span>上课地点</span>
        <input v-model.trim="bookingForm.location" class="input" placeholder="必填" />
      </label>

      <label class="form-label">
        <span>备注</span>
        <input v-model.trim="bookingForm.remark" class="input" placeholder="选填" />
      </label>

      <div class="action-row">
        <button class="ghost-btn" @click="closeBookingModal">取消</button>
        <button class="primary-btn" :disabled="bookingSubmitting" @click="handleConfirmBooking">
          {{ bookingSubmitting ? "提交中..." : "确认约课" }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="detailModalVisible" class="modal-mask" @click.self="detailModalVisible = false">
    <div class="modal-card">
      <h3>我的预约详情</h3>
      <p class="muted">{{ detailData.date }} {{ detailData.start_time }}-{{ detailData.end_time }}</p>
      <p>课程：{{ detailData.course_type }}</p>
      <p>地点：{{ detailData.location }}</p>
      <p v-if="detailData.remark">备注：{{ detailData.remark }}</p>
      <div class="action-row">
        <button class="primary-btn" @click="detailModalVisible = false">知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { getCurrentUser, setCurrentUser } from "../lib/auth";
import {
  COURSE_TYPES,
  buildDayMeta,
  buildScheduleSlots,
  createBookingDirect,
  fetchCoachBookingsByDate,
  fetchCoaches,
  fetchCurrentUser
} from "../lib/member-booking";

const MAX_DAY_OFFSET = 6;

const currentUser = ref(null);
const coaches = ref([]);
const selectedCoachId = ref("");
const dayOffset = ref(0);
const dayBookings = ref([]);

const bookingModalVisible = ref(false);
const bookingSubmitting = ref(false);
const bookingPreview = reactive({ start: "", end: "" });
const bookingForm = reactive({ courseType: "", location: "", remark: "" });

const detailModalVisible = ref(false);
const detailData = reactive({});

const dayMeta = computed(() => buildDayMeta(dayOffset.value));
const selectedCoach = computed(() => coaches.value.find((item) => item.id === selectedCoachId.value) || null);
const slots = computed(() =>
  buildScheduleSlots({
    bookings: dayBookings.value,
    memberId: currentUser.value?.id,
    targetDate: dayMeta.value.date
  })
);

async function initPage() {
  const localUser = getCurrentUser();
  if (!localUser?.id) return;

  currentUser.value = await fetchCurrentUser(localUser.id);
  setCurrentUser(currentUser.value);

  coaches.value = await fetchCoaches();
  if (coaches.value.length > 0) {
    selectedCoachId.value = coaches.value[0].id;
    await refreshDayBookings();
  }
}

async function refreshDayBookings() {
  if (!selectedCoachId.value) {
    dayBookings.value = [];
    return;
  }
  dayBookings.value = await fetchCoachBookingsByDate(selectedCoachId.value, dayMeta.value.dateKey);
}

function handleSelectCoach(coachId) {
  selectedCoachId.value = coachId;
  refreshDayBookings();
}

function handlePrevDay() {
  if (dayOffset.value <= 0) return;
  dayOffset.value -= 1;
  refreshDayBookings();
}

function handleNextDay() {
  if (dayOffset.value >= MAX_DAY_OFFSET) return;
  dayOffset.value += 1;
  refreshDayBookings();
}

function handleClickSlot(slot, index) {
  if (slot.status === "mine" && slot.bookingInfo) {
    Object.assign(detailData, slot.bookingInfo);
    detailModalVisible.value = true;
    return;
  }

  if (slot.status !== "free") return;

  const next = slots.value[index + 1];
  if (!next || next.status !== "free" || next.start !== slot.end) {
    window.alert("请选择连续的两个半小时");
    return;
  }

  bookingPreview.start = slot.start;
  bookingPreview.end = next.end;
  bookingForm.courseType = "";
  bookingForm.location = "";
  bookingForm.remark = "";
  bookingModalVisible.value = true;
}

function closeBookingModal() {
  bookingModalVisible.value = false;
}

async function handleConfirmBooking() {
  if (!selectedCoach.value || !currentUser.value) return;
  if (bookingSubmitting.value) return;

  bookingSubmitting.value = true;
  try {
    await createBookingDirect({
      member: currentUser.value,
      coach: selectedCoach.value,
      dateKey: dayMeta.value.dateKey,
      startTime: bookingPreview.start,
      endTime: bookingPreview.end,
      courseType: bookingForm.courseType,
      location: bookingForm.location,
      remark: bookingForm.remark
    });

    currentUser.value = await fetchCurrentUser(currentUser.value.id);
    setCurrentUser(currentUser.value);
    await refreshDayBookings();
    bookingModalVisible.value = false;
    window.alert("预约成功");
  } catch (error) {
    window.alert(error.message || "预约失败");
  } finally {
    bookingSubmitting.value = false;
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
  min-height: 62px;
}

.slot-time {
  display: block;
  font-weight: 600;
}

.slot-tag {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.slot-free {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.slot-occupied {
  border-color: #e5e7eb;
  background: #f3f4f6;
  color: #6b7280;
}

.slot-mine {
  border-color: #86efac;
  background: #f0fdf4;
}

.slot-past {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #9ca3af;
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
  width: min(480px, 100%);
  border-radius: 14px;
  background: #fff;
  padding: 16px;
}

.form-label {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.input {
  width: 100%;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 10px;
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
}

.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
