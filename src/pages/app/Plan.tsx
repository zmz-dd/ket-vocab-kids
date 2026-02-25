import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { BiTitle } from "@/components/Bilingual";
import { useAuth } from "@/contexts/AuthContext";
import { listBooks } from "@/lib/books";
import { getPlan, savePlan } from "@/lib/plan";
import { resetTodayLearned } from "@/lib/daily";

export default function PlanPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [bookIds, setBookIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"perDay" | "deadline">("perDay");
  const [perDay, setPerDay] = useState(20);
  const [days, setDays] = useState(10);
  const [order, setOrder] = useState<"alpha" | "random">("alpha");

  const totalWords = useMemo(() => {
    const map = new Map(books.map((b) => [b.id, b.wordCount || 0]));
    return bookIds.reduce((s, id) => s + (map.get(id) || 0), 0);
  }, [bookIds, books]);

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      setLoading(true);
      const bs = await listBooks();
      setBooks(bs);
      const p = await getPlan(user.id);
      if (p) {
        setBookIds(p.bookIds);
        setMode(p.mode);
        setPerDay(p.perDay);
        setDays(p.days);
        setOrder(p.order);
      } else {
        // 默认全选内置KET
        const defaults = bs.filter((b: any) => String(b.id).startsWith("ket_")).map((b: any) => b.id);
        setBookIds(defaults.length ? defaults : bs.slice(0, 1).map((b: any) => b.id));
      }
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Plan" zh="学习计划" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与学习计划 / Admin has no plan</div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Study Plan" zh="学习计划" />
        <div className="mt-2 text-sm text-muted-foreground">选择词书 → 选择模式 → 一键生成。修改计划会重置“今日已学”。</div>
      </Card>

      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="text-sm font-semibold">1) Books / 词书选择</div>
        {loading ? (
          <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-4 grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="border-2"
                onClick={() => setBookIds(books.map((b: any) => b.id))}
              >
                Select all
              </Button>
              <Button variant="outline" className="border-2" onClick={() => setBookIds([])}>
                Clear
              </Button>
              <div className="text-xs text-muted-foreground">
                Total words / 总词数：<span className="font-semibold text-foreground">{totalWords}</span>
              </div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {books.map((b: any) => {
                const checked = bookIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className="flex items-start gap-3 rounded-2xl border-2 border-black/10 bg-white/50 p-3"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const on = Boolean(v);
                        setBookIds((ids) => (on ? Array.from(new Set([...ids, b.id])) : ids.filter((x) => x !== b.id)));
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{b.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.isBuiltin ? "Builtin / 内置" : "Custom / 自定义"} · {b.wordCount || 0} words
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="text-sm font-semibold">2) Mode / 计划模式（二选一）</div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid gap-3">
              <label className="flex items-center gap-2">
                <RadioGroupItem value="perDay" />
                <div>
                  <div className="text-sm font-semibold">Per day</div>
                  <div className="text-xs text-muted-foreground">按天定量：每天背 X 个</div>
                </div>
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="deadline" />
                <div>
                  <div className="text-sm font-semibold">Deadline</div>
                  <div className="text-xs text-muted-foreground">限期完成：X 天背完</div>
                </div>
              </label>
            </RadioGroup>

            <div className="mt-4 grid gap-3">
              {mode === "perDay" ? (
                <div className="grid gap-2">
                  <Label>Daily / 每天</Label>
                  <Input
                    type="number"
                    min={1}
                    value={perDay}
                    onChange={(e) => setPerDay(Number(e.target.value))}
                    className="border-2"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Days / 天数</Label>
                  <Input
                    type="number"
                    min={1}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="border-2"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Order / 顺序</Label>
                <Select value={order} onValueChange={(v) => setOrder(v as any)}>
                  <SelectTrigger className="border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alpha">Alphabet / 字母顺序</SelectItem>
                    <SelectItem value="random">Random / 随机顺序</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
            <div className="text-sm font-semibold">Preview / 预览</div>
            <div className="mt-2 text-sm text-muted-foreground">
              词书范围内总词数：<span className="font-semibold text-foreground">{totalWords}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              生成后系统会把“今日已学”重置为 0，并从你勾选的词书中抓取新词。
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              注意：已学过的单词、错题本、复习结果都会保留（不会被清空）。
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="h-12 font-black shadow-[4px_4px_0_rgba(0,0,0,0.18)]"
            onClick={async () => {
              try {
                if (!bookIds.length) {
                  toast.error("请至少选择一本词书");
                  return;
                }

                const existing = await getPlan(user.id);
                if (existing) {
                  const ok = confirm("修改计划会重置‘今日已学’为 0，确定继续吗？");
                  if (!ok) return;
                }

                const plan = await savePlan({ userId: user.id, bookIds, mode, perDay, days, order });
                await resetTodayLearned(user.id);
                toast.success(`Saved! 今日目标：${plan.dailyTarget}`);
              } catch (e: any) {
                toast.error(e?.message || "失败");
              }
            }}
          >
            Generate / 生成计划
          </Button>

          <div className="text-xs text-muted-foreground">
            小提示：计划生成后去 Learn 开始学习。
          </div>
        </div>
      </Card>
    </div>
  );
}
