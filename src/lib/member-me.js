import { supabase } from "./supabase";

const STATUS_PENDING = "\u5f85\u786e\u8ba4";
const STATUS_CONFIRMED = "\u5df2\u786e\u8ba4";
const STATUS_COMPLETED = "\u5df2\u5b8c\u6210";
const STATUS_CANCELLED = "\u5df2\u53d6\u6d88";

export const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: STATUS_PENDING, label: "待确认" },
  { value: STATUS_CONFIRMED, label: "已确认" },
  { value: STATUS_COMPLETED, label: "已完成" },
  { value: STATUS_CANCELLED, label: "已取消" }
];

function pad(value) {
  return String(value).padStart(2, "0");
}

export function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function monthBounds(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 1, 0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

export async function fetchMemberBookings(memberId) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, date, start_time, end_time, coach_name, course_type, location, remark, status")
    .eq("member_id", memberId)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) throw new Error(error.message || "加载预约记录失败");
  return data || [];
}

export async function fetchMemberCreditLogs(memberId) {
  const { data, error } = await supabase
    .from("credit_logs")
    .select("id, change_amount, reason, balance_after, created_at")
    .eq("user_id", memberId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "加载课时流水失败");
  return data || [];
}

export function buildMonthOptionsFromLogs(logs, now = new Date()) {
  const set = new Set([monthKeyFromDate(now)]);
  logs.forEach((item) => {
    if (!item.created_at) return;
    set.add(String(item.created_at).slice(0, 7));
  });
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}
