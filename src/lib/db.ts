// 设计宣言（Memphis Kids Dashboard）
// - 把数据当成“贴纸”贴在墙上：清晰、夸张、好点
// - 永远先本地（local-first），刷新不丢

import { openDB, type DBSchema } from "idb";
import type { Book, Plan, User, WordEntry, WordProgress, DailyState } from "@/lib/models";

interface VocabDB extends DBSchema {
  meta: {
    key: string;
    value: any;
  };
  users: {
    key: string;
    value: User;
    indexes: { "by-username": string };
  };
  books: {
    key: string;
    value: Book;
  };
  words: {
    // `${bookId}::${word}`
    key: string;
    value: WordEntry;
    indexes: { "by-book": string };
  };
  progress: {
    // `${userId}::${bookId}::${word}`
    key: string;
    value: WordProgress;
    indexes: {
      "by-user": string;
      "by-user-book": string;
      // v2: use number 0/1 because boolean is not a valid IndexedDB key
      "by-user-mastered-v2": string;
    };
  };
  plans: {
    key: string; // userId
    value: Plan;
  };
  daily: {
    key: string; // `${userId}::${dateISO}`
    value: DailyState;
    indexes: { "by-user": string };
  };
}

export const DB_NAME = "ket_vocab_kids";
export const DB_VERSION = 2;

export async function getDB() {
  return openDB<VocabDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");

      if (!db.objectStoreNames.contains("users")) {
        const store = db.createObjectStore("users", { keyPath: "id" });
        store.createIndex("by-username", "username", { unique: true });
      }

      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("words")) {
        const store = db.createObjectStore("words", { keyPath: "key" });
        store.createIndex("by-book", "bookId", { unique: false });
      }

      if (!db.objectStoreNames.contains("progress")) {
        const store = db.createObjectStore("progress", { keyPath: "key" });
        store.createIndex("by-user", "userId", { unique: false });
        store.createIndex("by-user-book", ["userId", "bookId"], { unique: false });
        store.createIndex("by-user-mastered-v2", ["userId", "masteredKey"], { unique: false });
      } else {
        const store = transaction.objectStore("progress") as any;
        if (!store.indexNames.contains("by-user-mastered-v2")) {
          store.createIndex("by-user-mastered-v2", ["userId", "masteredKey"], { unique: false });
        }

        // v2 迁移：补齐 masteredKey（0/1）。boolean 不能做索引 key。
        let cursor = await store.openCursor();
        while (cursor) {
          const v: any = cursor.value;
          const mastered = Boolean(v.mastered);
          const masteredKey = mastered ? 1 : 0;
          if (v.masteredKey !== masteredKey) {
            v.masteredKey = masteredKey;
            await cursor.update(v);
          }
          cursor = await cursor.continue();
        }
      }

      if (!db.objectStoreNames.contains("plans")) {
        db.createObjectStore("plans", { keyPath: "userId" });
      }

      if (!db.objectStoreNames.contains("daily")) {
        const store = db.createObjectStore("daily", { keyPath: "key" });
        store.createIndex("by-user", "userId", { unique: false });
      }
    },
  });
}

export function wordKey(bookId: string, word: string) {
  return `${bookId}::${word.toLowerCase()}`;
}

export function progressKey(userId: string, bookId: string, word: string) {
  return `${userId}::${bookId}::${word.toLowerCase()}`;
}

export function dailyKey(userId: string, dateISO: string) {
  return `${userId}::${dateISO}`;
}
