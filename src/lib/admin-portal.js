import { buildDayMeta, buildScheduleSlots, fetchCoachBookingsByDate, fetchCoaches } from "./member-booking";
import { supabase } from "./supabase";

const ROLE_MEMBER = "member";
const ROLE_COACH = "coach";
const ROLE_ADMIN = "admin";
const CREDIT_REASON_ADD = "\u7ba1\u7406\u5458\u589e\u52a0\u8bfe\u65f6";
const CREDIT_REASON_REDUCE = "\u7ba1\u7406\u5458\u51cf\u5c11\u8bfe\u65f6";
const DEFAULT_CANCEL_BASE = 3;

export { buildDayMeta, buildScheduleSlots, fetchCoachBookingsByDate, fetchCoaches };

function parseBonusMap(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return { ...raw };
}

function monthKeyNow(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export async function fetchManageableUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, nickname, role, available_credits, same_day_cancel_bonus")
    .neq("role", ROLE_ADMIN)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message || "Failed to load users");
  return data || [];
}

export function mapUserView(item, now = new Date()) {
  const monthKey = monthKeyNow(now);
  const bonusMap = parseBonusMap(item.same_day_cancel_bonus);
  const bonus = Number(bonusMap[monthKey] || 0);
  return {
    ...item,
    monthKey,
    roleText: item.role === ROLE_MEMBER ? "Member" : "Coach",
    cancelSummaryText: `${DEFAULT_CANCEL_BASE + bonus} total this month`
  };
}

export async function promoteMemberToCoach(userId) {
  const { data, error } = await supabase
    .from("users")
    .update({ role: ROLE_COACH })
    .eq("id", userId)
    .eq("role", ROLE_MEMBER)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to promote member");
  if (!data) throw new Error("User is not a member");
  return { ok: true };
}

export async function changeMemberCredits(userId, delta) {
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Invalid credit change amount");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, role, available_credits")
    .eq("id", userId)
    .single();

  if (userError) throw new Error(userError.message || "Failed to load user");
  if (user.role !== ROLE_MEMBER) throw new Error("Only members can change credits");

  const current = Number(user.available_credits || 0);
  const next = current + amount;
  if (next < 0) throw new Error("Credits cannot be negative");

  const { error: updateError } = await supabase
    .from("users")
    .update({ available_credits: next })
    .eq("id", userId);

  if (updateError) throw new Error(updateError.message || "Failed to update credits");

  await supabase.from("credit_logs").insert({
    user_id: userId,
    change_amount: amount,
    reason: amount > 0 ? CREDIT_REASON_ADD : CREDIT_REASON_REDUCE,
    balance_after: next
  });

  return { ok: true };
}

export async function addSameDayCancelChance(userId, now = new Date()) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, role, same_day_cancel_bonus")
    .eq("id", userId)
    .single();

  if (userError) throw new Error(userError.message || "Failed to load user");
  if (user.role !== ROLE_MEMBER) throw new Error("Only members can update cancel chance");

  const monthKey = monthKeyNow(now);
  const bonusMap = parseBonusMap(user.same_day_cancel_bonus);
  bonusMap[monthKey] = Number(bonusMap[monthKey] || 0) + 1;

  const { error: updateError } = await supabase
    .from("users")
    .update({ same_day_cancel_bonus: bonusMap })
    .eq("id", userId);

  if (updateError) throw new Error(updateError.message || "Failed to update cancel chance");
  return { ok: true };
}
