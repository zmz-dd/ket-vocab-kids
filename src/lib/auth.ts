// 设计宣言（Memphis Kids Dashboard）
// - 登录要“像游戏开场”：简单、好玩、不卡人

import { nanoid } from "nanoid";
import { getDB } from "@/lib/db";
import type { User } from "@/lib/models";

export const SESSION_KEY = "kvk_current_user";

export const AVATARS: { id: string; label: string }[] = [
  { id: "red", label: "Red Bird / 红鸟" },
  { id: "yellow", label: "Yellow Bird / 黄鸟" },
  { id: "blue", label: "Blue Bird / 蓝鸟" },
  { id: "black", label: "Bomb / 黑炸弹" },
  { id: "pig", label: "Green Pig / 绿猪" },
  { id: "white", label: "Matilda / 白鸡" },
];

export async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function ensureAdminUser() {
  const db = await getDB();
  const existing = await db.getFromIndex("users", "by-username", "zhx");
  if (existing) return existing;
  const admin: User = {
    id: nanoid(),
    username: "zhx",
    passwordHash: await sha256("1989"),
    avatarId: "black",
    role: "admin",
    createdAt: Date.now(),
  };
  await db.put("users", admin);
  return admin;
}

export async function registerUser(params: { username: string; password: string; avatarId: string }) {
  const db = await getDB();
  const exists = await db.getFromIndex("users", "by-username", params.username);
  if (exists) throw new Error("用户名已存在 / Username already exists");
  const user: User = {
    id: nanoid(),
    username: params.username,
    passwordHash: await sha256(params.password),
    avatarId: params.avatarId,
    role: "user",
    createdAt: Date.now(),
  };
  await db.put("users", user);
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export async function login(username: string, password: string) {
  const db = await getDB();
  const user = await db.getFromIndex("users", "by-username", username);
  if (!user) throw new Error("账号不存在 / Account not found");
  const hash = await sha256(password);
  if (hash !== user.passwordHash) throw new Error("密码不正确 / Wrong password");
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const db = await getDB();
  return (await db.get("users", userId)) ?? null;
}

export async function listUsers() {
  const db = await getDB();
  return db.getAll("users");
}

export async function createUserByAdmin(params: { username: string; password: string; avatarId: string }) {
  const db = await getDB();
  const exists = await db.getFromIndex("users", "by-username", params.username);
  if (exists) throw new Error("用户名已存在 / Username already exists");
  const user: User = {
    id: nanoid(),
    username: params.username,
    passwordHash: await sha256(params.password),
    avatarId: params.avatarId,
    role: "user",
    createdAt: Date.now(),
  };
  await db.put("users", user);
  return user;
}

export async function deleteUser(userId: string) {
  const db = await getDB();
  const user = await db.get("users", userId);
  if (!user) return;
  if (user.role === "admin") throw new Error("管理员不能删除 / Admin cannot be deleted");

  // 删除关联数据
  const tx = db.transaction(["users", "progress", "plans", "daily"], "readwrite");
  await tx.objectStore("users").delete(userId);

  const progStore = tx.objectStore("progress");
  let cursor = await progStore.index("by-user").openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.objectStore("plans").delete(userId);

  const dailyStore = tx.objectStore("daily");
  let dcursor = await dailyStore.index("by-user").openCursor(userId);
  while (dcursor) {
    await dcursor.delete();
    dcursor = await dcursor.continue();
  }

  await tx.done;
}
