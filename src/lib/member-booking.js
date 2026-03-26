import { supabase } from "./supabase";

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;

const STATUS_CANCELLED = "\u5df2\u53d6\u6d88";
const STATUS_CONFIRMED = "\u5df2\u786e\u8ba4";
const CREDIT_REASON_BOOK = "\u9884\u7ea6\u8bfe\u7a0b\u6263\u51cf\u8bfe\u65f6";

export const COURSE_TYPES = [
  "\u5e38\u89c4\u8bfe\u7a0b",
  "\u640f\u51fb\u8bfe\u7a0b",
  "\u5b55\u4ea7\u8bfe\u7a0b"
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeToMinutes(timeText) {
  const [hour, minute] = String(timeText).split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(total) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${pad(hour)}:${pad(minute)}`;
}

function formatDayLabel(targetDate, now = new Date()) {
  const todayKey = toDateKey(now);
  const targetKey = toDateKey(targetDate);
  const weekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const prefix = targetKey === todayKey ? "Today" : weekNames[targetDate.getDay()];
  return `${prefix} ${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
}

export function getDateByOffset(offsetDays) {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + offsetDays);
  return target;
}

export function buildScheduleSlots({ bookings, memberId, targetDate, now = new Date() }) {
  const slots = [];
  const isToday = toDateKey(targetDate) === toDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + SLOT_MINUTES;
      if (endMinutes > END_HOUR * 60) continue;

      const start = minutesToTime(startMinutes);
      const end = minutesToTime(endMinutes);
      const inPast = isToday && startMinutes <= currentMinutes;

      let status = inPast ? "past" : "free";
      let bookingInfo = null;

      bookings.forEach((booking) => {
        const bookingStart = timeToMinutes(booking.start_time || booking.start);
        const bookingEnd = timeToMinutes(booking.end_time || booking.end);
        const overlap = startMinutes < bookingEnd && endMinutes > bookingStart;
        if (!overlap) return;

        bookingInfo = booking;
        status = booking.member_id === memberId || booking.memberId === memberId ? "mine" : "occupied";
      });

      slots.push({
        key: `${start}-${end}`,
        start,
        end,
        label: `${start}-${end}`,
        status,
        bookingInfo
      });
    }
  }

  return slots;
}

export async function fetchCurrentUser(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, nickname, role, available_credits")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message || "Failed to load user");
  return data;
}

export async function fetchCoaches() {
  const { data, error } = await supabase
    .from("users")
    .select("id, nickname, username")
    .eq("role", "coach")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message || "Failed to load coaches");
  return data || [];
}

export async function fetchCoachBookingsByDate(coachId, dateKey) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, member_id, member_name, coach_id, coach_name, date, start_time, end_time, course_type, location, remark, status"
    )
    .eq("coach_id", coachId)
    .eq("date", dateKey)
    .neq("status", STATUS_CANCELLED)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message || "Failed to load bookings");
  return data || [];
}

export function buildDayMeta(dayOffset) {
  const date = getDateByOffset(dayOffset);
  return {
    dayOffset,
    date,
    dateKey: toDateKey(date),
    label: formatDayLabel(date)
  };
}

export async function createBookingDirect({
  member,
  coach,
  dateKey,
  startTime,
  endTime,
  courseType,
  location,
  remark
}) {
  if (!courseType) throw new Error("Please select course type");
  if (!String(location || "").trim()) throw new Error("Location is required");

  const freshMember = await fetchCurrentUser(member.id);
  if (Number(freshMember.available_credits || 0) <= 0) {
    throw new Error("No available credits");
  }

  const { data: conflict, error: conflictError } = await supabase
    .from("bookings")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("date", dateKey)
    .eq("start_time", startTime)
    .eq("end_time", endTime)
    .neq("status", STATUS_CANCELLED)
    .maybeSingle();

  if (conflictError) throw new Error(conflictError.message || "Failed to check conflict");
  if (conflict) throw new Error("This time slot is occupied");

  const nextCredits = Number(freshMember.available_credits) - 1;
  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ available_credits: nextCredits })
    .eq("id", freshMember.id)
    .eq("available_credits", freshMember.available_credits)
    .select("id")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message || "Failed to deduct credits");
  if (!updatedUser) throw new Error("Credits changed, please retry");

  const bookingPayload = {
    member_id: freshMember.id,
    member_name: freshMember.nickname,
    coach_id: coach.id,
    coach_name: coach.nickname,
    date: dateKey,
    start_time: startTime,
    end_time: endTime,
    course_type: courseType,
    location: String(location || "").trim(),
    remark: String(remark || "").trim(),
    status: STATUS_CONFIRMED
  };

  const { error: insertError } = await supabase.from("bookings").insert(bookingPayload);
  if (insertError) {
    await supabase
      .from("users")
      .update({ available_credits: freshMember.available_credits })
      .eq("id", freshMember.id);
    throw new Error(insertError.message || "Failed to create booking");
  }

  await supabase.from("credit_logs").insert({
    user_id: freshMember.id,
    change_amount: -1,
    reason: CREDIT_REASON_BOOK,
    balance_after: nextCredits
  });

  return { ok: true };
}
