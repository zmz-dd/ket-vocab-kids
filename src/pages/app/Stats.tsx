import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BiTitle } from "@/components/Bilingual";

import { useAuth } from "@/contexts/AuthContext";
import { getPlan } from "@/lib/plan";
import { getDB } from "@/lib/db";
import { listBooks } from "@/lib/books";
import { listUserProgress } from "@/lib/progress";
import type { Plan, WordProgress } from "@/lib/models";

export default function StatsPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      const p = await getPlan(user.id);
      setPlan(p);
    })();
  }, [user]);

  const load = async () => {
    if (!user || !plan) return;
    const db = await getDB();
    const books = await listBooks();
    const prog = (await listUserProgress(user.id)) as any as WordProgress[];

    const masteredByBook = new Map<string, number>();
    for (const p of prog as any[]) {
      if (p.mastered) masteredByBook.set(p.bookId, (masteredByBook.get(p.bookId) || 0) + 1);
    }

    const filteredBooks = books.filter((b) => plan.bookIds.includes(b.id));

    const bookRows = filteredBooks.map((b) => {
      const mastered = masteredByBook.get(b.id) || 0;
      const total = b.wordCount || 0;
      const pct = total ? Math.round((mastered / total) * 100) : 0;
      return { book: b, mastered, total, pct };
    });

    // 维度统计：首字母
    const words = (await Promise.all(plan.bookIds.map((id) => db.getAllFromIndex("words", "by-book", id))))
      .flat() as any[];

    const masteredKeys = new Set(
      (prog as any[]).filter((p) => p.mastered).map((p) => `${p.bookId}::${String(p.word).toLowerCase()}`)
    );

    const initialMap: Record<string, { total: number; mastered: number }> = {};
    for (const w of words) {
      const ini = (w.initial || w.word?.[0] || "#").toUpperCase();
      initialMap[ini] ||= { total: 0, mastered: 0 };
      initialMap[ini].total++;
      if (masteredKeys.has(`${w.bookId}::${String(w.word).toLowerCase()}`)) initialMap[ini].mastered++;
    }

    const initialRows = Object.entries(initialMap)
      .map(([k, v]) => ({ initial: k, ...v, pct: v.total ? Math.round((v.mastered / v.total) * 100) : 0 }))
      .sort((a, b) => a.initial.localeCompare(b.initial));

    setRows([{ type: "books", data: bookRows }, { type: "initial", data: initialRows }]);
  };

  useEffect(() => {
    if (!plan) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const totalMastered = useMemo(() => {
    const b = rows.find((r) => r.type === "books")?.data as any[] | undefined;
    if (!b) return 0;
    return b.reduce((s, x) => s + (x.mastered || 0), 0);
  }, [rows]);

  const totalAll = useMemo(() => {
    const b = rows.find((r) => r.type === "books")?.data as any[] | undefined;
    if (!b) return 0;
    return b.reduce((s, x) => s + (x.total || 0), 0);
  }, [rows]);

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Stats" zh="统计" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与统计 / Admin has no stats</div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Stats" zh="统计" />
        <div className="mt-3 text-sm text-muted-foreground">请先去 Plan 设置学习计划。</div>
      </Card>
    );
  }

  const bookRows = rows.find((r) => r.type === "books")?.data as any[] | undefined;
  const initialRows = rows.find((r) => r.type === "initial")?.data as any[] | undefined;

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BiTitle en="Stats" zh="统计" />
          <Button variant="outline" className="border-2" onClick={load}>
            Refresh
          </Button>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Total mastered / 累计掌握：<span className="font-black text-foreground">{totalMastered}</span> / {totalAll}
        </div>
      </Card>

      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="text-sm font-semibold">By Book / 按词书</div>
        <div className="mt-4 grid gap-3">
          {bookRows?.map((r) => (
            <div key={r.book.id} className="rounded-2xl border-2 border-black/10 bg-white/55 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{r.book.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.mastered} / {r.total}
                  </div>
                </div>
                <div className="text-sm font-black">{r.pct}%</div>
              </div>
              <div className="mt-2">
                <Progress value={r.pct} className="h-3 border-2 border-black/10 bg-white/60" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="text-sm font-semibold">By Initial / 按首字母</div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {initialRows?.slice(0, 24).map((r) => (
            <div key={r.initial} className="rounded-2xl border-2 border-black/10 bg-white/55 p-3">
              <div className="flex items-center justify-between">
                <div className="font-black">{r.initial}</div>
                <div className="text-xs text-muted-foreground">
                  {r.mastered}/{r.total}
                </div>
              </div>
              <div className="mt-2">
                <Progress value={r.pct} className="h-2.5 border-2 border-black/10 bg-white/60" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">为避免页面过长，这里默认展示前 24 个字母桶。</div>
      </Card>
    </div>
  );
}
