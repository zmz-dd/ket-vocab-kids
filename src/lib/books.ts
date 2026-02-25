// 设计宣言（Memphis Kids Dashboard）
// - 词库是“关卡地图”：先内置三本，再允许无限扩充

import builtin from "@/assets/data/builtin_books.json";
import { getDB, wordKey } from "@/lib/db";
import type { Book, WordEntry } from "@/lib/models";

export interface BuiltinBookRaw {
  id: string;
  title: string;
  words: Array<{ word: string; pos: string; meaning: string; phonetic?: string; level?: string; initial?: string }>;
}

export async function seedBuiltinBooksIfNeeded() {
  const db = await getDB();
  const seeded = await db.get("meta", "seeded_builtin_v1");
  if (seeded) return;

  const raw = builtin as BuiltinBookRaw[];
  const tx = db.transaction(["books", "words", "meta"], "readwrite");

  for (const b of raw) {
    const book: Book = {
      id: b.id,
      title: b.title,
      description: "内置官方词库 / Built-in",
      isBuiltin: true,
      createdAt: Date.now(),
      wordCount: b.words.length,
    };
    await tx.objectStore("books").put(book);

    for (const w of b.words) {
      const entry: WordEntry = {
        word: w.word,
        pos: w.pos,
        definition: w.meaning,
        phonetic: w.phonetic || "",
        bookId: b.id,
        initial: w.initial,
        level: w.level,
      };
      await tx.objectStore("words").put({ ...entry, key: wordKey(b.id, w.word) } as any);
    }
  }

  await tx.objectStore("meta").put(true, "seeded_builtin_v1");
  await tx.done;
}

export async function listBooks() {
  const db = await getDB();
  return db.getAll("books");
}

export async function getWordsByBook(bookId: string) {
  const db = await getDB();
  return db.getAllFromIndex("words", "by-book", bookId);
}

export async function addCustomBook(params: { id: string; title: string; description?: string }) {
  const db = await getDB();
  const book: Book = {
    id: params.id,
    title: params.title,
    description: params.description,
    isBuiltin: false,
    createdAt: Date.now(),
    wordCount: 0,
  };
  await db.put("books", book);
  return book;
}

export async function importWordsToBook(params: { bookId: string; text: string }) {
  const db = await getDB();
  const lines = params.text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tx = db.transaction(["words", "books"], "readwrite");
  let added = 0;
  for (const word of lines) {
    const key = wordKey(params.bookId, word);
    const existing = await tx.objectStore("words").get(key);
    if (existing) continue;
    const entry: WordEntry = {
      word,
      pos: "",
      definition: "",
      phonetic: "",
      audio: "",
      example: "",
      exampleAudio: "",
      bookId: params.bookId,
      initial: word[0]?.toUpperCase(),
    };
    await tx.objectStore("words").put({ ...entry, key } as any);
    added++;
  }

  const book = await tx.objectStore("books").get(params.bookId);
  if (book) {
    book.wordCount = (book.wordCount || 0) + added;
    await tx.objectStore("books").put(book);
  }
  await tx.done;
  return { added };
}

// Create & Enrich：尽力联网补全（失败留空/待补充）
export async function enrichWordOnline(word: string) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("lookup_failed");
  const data = await res.json();
  const first = data?.[0];
  const phonetic = first?.phonetic || first?.phonetics?.find((p: any) => p?.text)?.text || "";
  const audio = first?.phonetics?.find((p: any) => p?.audio)?.audio || "";
  const meaning0 = first?.meanings?.[0];
  const pos = meaning0?.partOfSpeech ? String(meaning0.partOfSpeech) : "";
  const example = meaning0?.definitions?.find((d: any) => d?.example)?.example || "";
  return { phonetic, audio, pos, example };
}

export async function enrichBookWords(bookId: string, limit = 50) {
  const db = await getDB();
  const words = await db.getAllFromIndex("words", "by-book", bookId);
  const targets = words.filter((w: any) => !w.phonetic || !w.example).slice(0, limit);

  const tx = db.transaction(["words"], "readwrite");
  let ok = 0;
  let fail = 0;
  for (const w of targets) {
    try {
      const r = await enrichWordOnline(w.word);
      const updated = {
        ...w,
        phonetic: w.phonetic || r.phonetic || "",
        audio: w.audio || r.audio || "",
        pos: w.pos || r.pos || "",
        example: w.example || r.example || "",
      };
      await tx.objectStore("words").put(updated);
      ok++;
    } catch {
      fail++;
    }
  }
  await tx.done;
  return { ok, fail, total: targets.length };
}
