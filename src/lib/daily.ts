import { getDB, dailyKey } from "@/lib/db";
import type { DailyState, Plan, WordEntry } from "@/lib/models";
import { todayISO } from "@/lib/scheduler";

export async function getOrCreateToday(userId: string, plan: Plan): Promise<DailyState> {
  const db = await getDB();
  const dateISO = todayISO();
  const key = dailyKey(userId, dateISO);
  const existing = await db.get("daily", key);
  if (existing) return existing;

  const start = new Date(plan.startDateISO + "T00:00:00");
  const now = new Date(dateISO + "T00:00:00");
  const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const streakDayIndex = diffDays + 1;

  const totalDays = Math.max(1, Math.ceil(plan.totalWords / Math.max(1, plan.dailyTarget)));

  const state: DailyState = {
    userId,
    dateISO,
    learnedToday: 0,
    targetToday: plan.dailyTarget,
    streakDayIndex,
    totalDays,
    learnedWordKeys: [],
  } as any;

  await db.put("daily", { ...state, key } as any);
  return state;
}

export async function incrementLearned(userId: string, plan: Plan, w: WordEntry) {
  const db = await getDB();
  const dateISO = todayISO();
  const key = dailyKey(userId, dateISO);
  const existing = (await db.get("daily", key)) as any as DailyState | undefined;
  const state = existing ?? (await getOrCreateToday(userId, plan));

  state.learnedToday = (state.learnedToday || 0) + 1;
  state.targetToday = plan.dailyTarget;
  state.learnedWordKeys = Array.from(new Set([...(state.learnedWordKeys || []), `${w.bookId}::${w.word.toLowerCase()}`]));

  await db.put("daily", { ...(state as any), key });
  return state;
}

export async function resetTodayLearned(userId: string) {
  const db = await getDB();
  const dateISO = todayISO();
  const key = dailyKey(userId, dateISO);
  const existing = await db.get("daily", key);
  if (!existing) return;
  (existing as any).learnedToday = 0;
  (existing as any).learnedWordKeys = [];
  await db.put("daily", existing as any);
}
