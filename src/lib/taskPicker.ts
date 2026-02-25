import { getDB } from "@/lib/db";
import type { Plan, WordEntry, WordProgress } from "@/lib/models";

export async function pickWords(params: {
  userId: string;
  plan: Plan;
  count: number;
  mode: "plan" | "append";
}) {
  const db = await getDB();

  // 读取范围内单词
  const wordsByBook: Record<string, WordEntry[]> = {};
  for (const bookId of params.plan.bookIds) {
    const list = (await db.getAllFromIndex("words", "by-book", bookId)) as any as WordEntry[];
    wordsByBook[bookId] = list;
  }
  const allWords = params.plan.bookIds.flatMap((id) => wordsByBook[id] || []);

  // 当前用户进度
  const progressAll = (await db.getAllFromIndex("progress", "by-user", params.userId)) as any as WordProgress[];
  const byKey = new Map(progressAll.map((p: any) => [`${p.bookId}::${String(p.word).toLowerCase()}`, p]));

  // 计划顺序：alpha/random
  const ordered = (() => {
    const arr = [...allWords];
    if (params.plan.order === "alpha") {
      arr.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      // Fisher–Yates
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  })();

  const now = Date.now();

  // 1) 未学新词：没有进度 或 status=new
  const newWords = ordered.filter((w) => {
    const p = byKey.get(`${w.bookId}::${w.word.toLowerCase()}`) as any;
    return !p || p.status === "new";
  });

  if (params.mode === "plan") {
    return newWords.slice(0, params.count);
  }

  // append：优先级队列
  const picked: WordEntry[] = [];
  const take = (arr: WordEntry[]) => {
    for (const w of arr) {
      if (picked.length >= params.count) break;
      const k = `${w.bookId}::${w.word.toLowerCase()}`;
      if (picked.some((x) => `${x.bookId}::${x.word.toLowerCase()}` === k)) continue;
      picked.push(w);
    }
  };

  take(newWords);
  if (picked.length >= params.count) return picked;

  // 2) 高频错题
  const wrongKeys = progressAll
    .filter((p: any) => params.plan.bookIds.includes(p.bookId) && ((p.wrongLearnCount || 0) + (p.wrongQuizCount || 0) > 0))
    .sort(
      (a: any, b: any) =>
        (b.wrongLearnCount + b.wrongQuizCount) - (a.wrongLearnCount + a.wrongQuizCount) || (b.lastWrongAt ?? 0) - (a.lastWrongAt ?? 0)
    )
    .map((p: any) => `${p.bookId}::${String(p.word).toLowerCase()}`);

  const wrongWords = wrongKeys
    .map((k) => {
      const [bookId, word] = k.split("::");
      return (wordsByBook[bookId] || []).find((w) => w.word.toLowerCase() === word);
    })
    .filter(Boolean) as WordEntry[];

  take(wrongWords);
  if (picked.length >= params.count) return picked;

  // 3) 待复习
  const dueKeys = progressAll
    .filter((p: any) => params.plan.bookIds.includes(p.bookId) && p.nextReviewAt != null && p.nextReviewAt <= now)
    .sort((a: any, b: any) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .map((p: any) => `${p.bookId}::${String(p.word).toLowerCase()}`);

  const dueWords = dueKeys
    .map((k) => {
      const [bookId, word] = k.split("::");
      return (wordsByBook[bookId] || []).find((w) => w.word.toLowerCase() === word);
    })
    .filter(Boolean) as WordEntry[];

  take(dueWords);
  if (picked.length >= params.count) return picked;

  // 4) 最早学习词（lastSeenAt 最小）
  const earlyKeys = progressAll
    .filter((p: any) => params.plan.bookIds.includes(p.bookId) && p.mastered)
    .sort((a: any, b: any) => (a.lastSeenAt ?? 0) - (b.lastSeenAt ?? 0))
    .map((p: any) => `${p.bookId}::${String(p.word).toLowerCase()}`);

  const earlyWords = earlyKeys
    .map((k) => {
      const [bookId, word] = k.split("::");
      return (wordsByBook[bookId] || []).find((w) => w.word.toLowerCase() === word);
    })
    .filter(Boolean) as WordEntry[];

  take(earlyWords);
  return picked;
}
