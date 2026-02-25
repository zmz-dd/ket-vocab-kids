// 设计宣言（Memphis Kids Dashboard）
// - 状态记录要“可解释”：每次点击都能回放

import { getDB, progressKey } from "@/lib/db";
import type { WordEntry, WordProgress } from "@/lib/models";
import { nextReviewAt } from "@/lib/scheduler";

export async function getProgress(userId: string, bookId: string, word: string): Promise<WordProgress | null> {
  const db = await getDB();
  return (await db.get("progress", progressKey(userId, bookId, word))) ?? null;
}

export async function upsertProgress(p: WordProgress) {
  const db = await getDB();
  await db.put("progress", p);
}

function baseProgress(userId: string, w: WordEntry): WordProgress {
  const now = Date.now();
  return {
    key: progressKey(userId, w.bookId, w.word),
    userId,
    bookId: w.bookId,
    word: w.word,

    status: "new",
    mastered: false,
    masteredKey: 0,

    wrongLearnCount: 0,
    wrongQuizCount: 0,

    stage: 0,
    lastSeenAt: undefined,
    nextReviewAt: undefined,

    seenCount: 0,
    updatedAt: now,
  } as any;
}

export async function markLearn(userId: string, w: WordEntry, action: "known" | "unknown" | "skipped") {
  const db = await getDB();
  const key = progressKey(userId, w.bookId, w.word);
  const existing = (await db.get("progress", key)) as any as WordProgress | undefined;
  const now = Date.now();
  const p = existing ?? baseProgress(userId, w);

  p.status = action;
  p.seenCount = (p.seenCount || 0) + 1;
  p.lastSeenAt = now;
  p.updatedAt = now;

  if (action === "known" || action === "skipped") {
    p.mastered = true;
    p.masteredKey = 1;
    const r = nextReviewAt(now, p.stage ?? 0);
    p.stage = r.stage;
    p.nextReviewAt = r.nextAt;
  } else {
    p.mastered = false;
    p.masteredKey = 0;
    p.masteredKey = 0;
    p.wrongLearnCount = (p.wrongLearnCount || 0) + 1;
    p.lastWrongAt = now;
    // 立即安排复习：stage 不前进，nextReviewAt=now
    p.nextReviewAt = now;
  }

  await db.put("progress", { ...(p as any), key });
  return p;
}

export async function markQuiz(userId: string, w: WordEntry, correct: boolean) {
  const db = await getDB();
  const key = progressKey(userId, w.bookId, w.word);
  const existing = (await db.get("progress", key)) as any as WordProgress | undefined;
  const now = Date.now();
  const p = existing ?? baseProgress(userId, w);

  p.seenCount = (p.seenCount || 0) + 1;
  p.lastSeenAt = now;
  p.updatedAt = now;

  if (correct) {
    p.mastered = true;
    p.masteredKey = 1;
    const r = nextReviewAt(now, p.stage ?? 0);
    p.stage = r.stage;
    p.nextReviewAt = r.nextAt;
  } else {
    p.mastered = false;
    p.wrongQuizCount = (p.wrongQuizCount || 0) + 1;
    p.lastWrongAt = now;
    p.nextReviewAt = now;
  }

  await db.put("progress", { ...(p as any), key });
  return p;
}

export async function listUserProgress(userId: string) {
  const db = await getDB();
  return db.getAllFromIndex("progress", "by-user", userId);
}

export async function countMastered(userId: string) {
  const db = await getDB();
  const all = await db.getAllFromIndex(
    "progress",
    "by-user-mastered-v2",
    IDBKeyRange.only([userId, 1] as any)
  );
  return all.length;
}

export async function listDueReview(userId: string, bookIds: string[], limit = 50) {
  const db = await getDB();
  const all = await db.getAllFromIndex("progress", "by-user", userId);
  const now = Date.now();
  return all
    .filter((p: any) => bookIds.includes(p.bookId) && p.nextReviewAt != null && p.nextReviewAt <= now)
    .sort((a: any, b: any) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .slice(0, limit);
}
