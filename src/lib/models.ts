// 设计宣言（Memphis Kids Dashboard）
// - 高饱和撞色：阳光黄底 + 青蓝/珊瑚红点缀
// - “贴纸/卡片”质感：粗描边、阴影偏移、圆角不统一
// - 文案双语：英文主标题 + 中文小字说明

export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  avatarId: string;
  role: Role;
  createdAt: number; // epoch ms
}

export interface WordEntry {
  // IndexedDB 实际存储会带 key 字段（keyPath）
  key?: string;
  word: string;
  pos: string;
  definition: string; // 中文释义
  phonetic?: string;
  audio?: string;
  example?: string;
  exampleAudio?: string;
  bookId: string;
  initial?: string;
  level?: string;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  isBuiltin: boolean;
  createdAt: number;
  wordCount: number;
}

export type LearnStatus = "new" | "known" | "unknown" | "skipped";

export interface WordProgress {
  // IndexedDB 实际存储会带 key 字段（keyPath）
  key?: string;
  userId: string;

  // IndexedDB 索引用：boolean 不是合法 key，因此用 0/1
  masteredKey?: 0 | 1;
  bookId: string;
  word: string; // primary key under composite

  // 学习/掌握
  status: LearnStatus;
  mastered: boolean; // 排行榜口径：认识/答对/纠错学对

  // 错题
  wrongLearnCount: number;
  wrongQuizCount: number;
  lastWrongAt?: number;

  // 复习（艾宾浩斯简化版）
  stage: number; // 0..n
  lastSeenAt?: number;
  nextReviewAt?: number;

  // 统计
  seenCount: number;
  updatedAt: number;
}

export type PlanMode = "perDay" | "deadline";
export type PlanOrder = "alpha" | "random";

export interface Plan {
  userId: string;
  bookIds: string[];
  mode: PlanMode;
  perDay: number; // mode=perDay
  days: number; // mode=deadline
  order: PlanOrder;

  // 系统派生
  createdAt: number;
  startDateISO: string; // local date string YYYY-MM-DD
  totalWords: number;
  dailyTarget: number;
}

export interface DailyState {
  // IndexedDB keyPath
  key?: string;
  userId: string;
  dateISO: string; // YYYY-MM-DD
  learnedToday: number;
  targetToday: number;
  streakDayIndex: number; // 第X天
  totalDays: number; // 总Y天
  learnedWordKeys?: string[]; // 今日学过的词（bookId::word）
}
