import { supabase } from "./supabase";
import { buildDayMeta, buildScheduleSlots, fetchCoachBookingsByDate, fetchCurrentUser } from "./member-booking";

const STATUS_CONFIRMED = "\u5df2\u786e\u8ba4";
const STATUS_COMPLETED = "\u5df2\u5b8c\u6210";
const STATUS_CANCELLED = "\u5df2\u53d6\u6d88";
const CREDIT_REASON_REFUND = "\u9884\u7ea6\u53d6\u6d88\u8fd4\u8fd8\u8bfe\u65f6";

export { buildDayMeta, buildScheduleSlots, fetchCoachBookingsByDate, fetchCurrentUser };

export function canMarkCompleted(status) {
  return status === STATUS_CONFIRMED;
}

export function canCancel(status) {
  return status === STATUS_CONFIRMED;
}

export async function markBookingCompleted(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: STATUS_COMPLETED, updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to mark completed");
  if (!data) throw new Error("Booking not found");
  return { ok: true };
}

export async function cancelBookingByCoach(booking) {
  const { data: bookingResult, error: bookingError } = await supabase
    .from("bookings")
    .update({ status: STATUS_CANCELLED, updated_at: new Date().toISOString() })
    .eq("id", booking.id)
    .select("id")
    .maybeSingle();

  if (bookingError) throw new Error(bookingError.message || "Failed to cancel booking");
  if (!bookingResult) throw new Error("Booking not found");

  const member = await fetchCurrentUser(booking.member_id);
  const nextCredits = Number(member.available_credits || 0) + 1;
  const { error: creditError } = await supabase
    .from("users")
    .update({ available_credits: nextCredits })
    .eq("id", booking.member_id);

  if (creditError) throw new Error(creditError.message || "Failed to refund credits");

  await supabase.from("credit_logs").insert({
    user_id: booking.member_id,
    change_amount: 1,
    reason: CREDIT_REASON_REFUND,
    balance_after: nextCredits
  });

  return { ok: true };
}
