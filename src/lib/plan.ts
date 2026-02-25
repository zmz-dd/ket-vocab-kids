// 设计宣言（Memphis Kids Dashboard）
// - 计划像“日历任务”：清楚、可改、可重置（但不丢历史）

import { getDB } from "@/lib/db";
import type { Plan, PlanMode, PlanOrder } from "@/lib/models";
import { todayISO } from "@/lib/scheduler";

export function computeDailyTarget(totalWords: number, mode: PlanMode, perDay: number, days: number) {
  if (!Number.isFinite(totalWords) || totalWords <= 0) return 0;
  if (mode === "perDay") {
    const x = Math.max(1, Math.floor(perDay || 1));
    return x;
  }
  const d = Math.max(1, Math.floor(days || 1));
  return Math.ceil(totalWords / d);
}

export function computeTotalDays(totalWords: number, dailyTarget: number) {
  if (!Number.isFinite(totalWords) || totalWords <= 0) return 0;
  const dt = Math.max(1, Math.floor(dailyTarget || 1));
  return Math.ceil(totalWords / dt);
}

export async function savePlan(params: {
  userId: string;
  bookIds: string[];
  mode: PlanMode;
  perDay: number;
  days: number;
  order: PlanOrder;
}) {
  const db = await getDB();
  const books = await db.getAll("books");
  const selected = new Set(params.bookIds);
  const totalWords = books.filter((b) => selected.has(b.id)).reduce((s, b) => s + (b.wordCount || 0), 0);

  const dailyTarget = computeDailyTarget(totalWords, params.mode, params.perDay, params.days);
  const totalDays = computeTotalDays(totalWords, dailyTarget);

  const plan: Plan = {
    userId: params.userId,
    bookIds: params.bookIds,
    mode: params.mode,
    perDay: Math.max(1, Math.floor(params.perDay || 1)),
    days: Math.max(1, Math.floor(params.days || 1)),
    order: params.order,
    createdAt: Date.now(),
    startDateISO: todayISO(),
    totalWords,
    dailyTarget,
  };

  await db.put("plans", plan);
  return plan;
}

export async function getPlan(userId: string) {
  const db = await getDB();
  return (await db.get("plans", userId)) ?? null;
}
