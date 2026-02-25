// 设计宣言（Memphis Kids Dashboard）
// - 复习是“定时回头打怪”：时间点清晰，孩子不焦虑

// 简化的艾宾浩斯间隔（天）
export const REVIEW_DAYS = [0, 1, 2, 4, 7, 15];

export function addDays(epochMs: number, days: number) {
  return epochMs + days * 24 * 60 * 60 * 1000;
}

export function nextReviewAt(now: number, stage: number) {
  const nextStage = Math.min(stage + 1, REVIEW_DAYS.length - 1);
  return { stage: nextStage, nextAt: addDays(now, REVIEW_DAYS[nextStage]) };
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
