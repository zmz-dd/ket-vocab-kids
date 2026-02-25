import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { BiTitle } from "@/components/Bilingual";
import { useAuth } from "@/contexts/AuthContext";
import { getPlan } from "@/lib/plan";
import { getDB } from "@/lib/db";
import { listUserProgress, markLearn } from "@/lib/progress";
import { isToday, playAudioOrSpeak } from "@/lib/speak";
import type { Plan, WordEntry, WordProgress } from "@/lib/models";

type Step = "front" | "back";

function QuickCard({ w, step }: { w: WordEntry; step: Step }) {
  return (
    <div className="rounded-[2rem] border-2 border-black/15 bg-white/70 p-6 shadow-[12px_12px_0_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-4xl font-black tracking-tight">{w.word}</div>
          <div className="mt-1 text-sm text-muted-foreground">{w.phonetic || ""}</div>
        </div>
        <Button variant="outline" className="border-2" onClick={() => playAudioOrSpeak(w.audio, w.word)}>
          Speak
        </Button>
      </div>

      {step === "back" && (
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border-2 border-black/10 bg-[oklch(0.97_0.06_95)] p-4">
            <div className="text-sm font-semibold">Meaning / 中文</div>
            <div className="mt-1 text-lg font-black">{w.definition || "（待补充）"}</div>
          </div>
          <div className="rounded-2xl border-2 border-black/10 bg-white/55 p-4">
            <div className="text-sm font-semibold">Example / 例句</div>
            <div className="mt-2 text-sm">{w.example || ""}</div>
            <div className="mt-3">
              <Button variant="secondary" className="border-2 border-black/10" onClick={() => playAudioOrSpeak(w.exampleAudio, w.example || w.word)}>
                Listen / 听
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "front" && (
        <div className="mt-4 text-sm text-muted-foreground">
          先想一想，再点按钮看答案。
        </div>
      )}
    </div>
  );
}

export default function MistakesPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<
    Array<{ p: WordProgress; w: WordEntry; totalWrong: number; source: string }>
  >([]);
  const [onlyToday, setOnlyToday] = useState(false);

  // quick review
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [i, setI] = useState(0);
  const [step, setStep] = useState<Step>("front");

  const current = queue[i];

  const load = async () => {
    if (!user || !plan) return;
    const db = await getDB();
    const prog = (await listUserProgress(user.id)) as any as WordProgress[];
    const list = prog
      .filter((p: any) => plan.bookIds.includes(p.bookId) && (p.wrongLearnCount + p.wrongQuizCount > 0))
      .filter((p: any) => (onlyToday ? isToday(p.lastWrongAt) : true))
      .sort((a: any, b: any) => (b.wrongLearnCount + b.wrongQuizCount) - (a.wrongLearnCount + a.wrongQuizCount));

    const res: any[] = [];
    for (const p of list) {
      const key = `${p.bookId}::${String(p.word).toLowerCase()}`;
      const w = (await db.get("words", key)) as any;
      if (!w) continue;
      const source = p.wrongLearnCount > 0 && p.wrongQuizCount > 0 ? "learn+quiz" : p.wrongLearnCount > 0 ? "learn" : "quiz";
      res.push({ p, w, totalWrong: p.wrongLearnCount + p.wrongQuizCount, source });
    }
    setItems(res);
  };

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      const p = await getPlan(user.id);
      setPlan(p);
    })();
  }, [user]);

  useEffect(() => {
    if (!plan) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, onlyToday]);

  const startReview = (words: WordEntry[]) => {
    if (!words.length) {
      toast.error("没有错题可以复习");
      return;
    }
    setQueue(words);
    setI(0);
    setStep("front");
    setOpen(true);
  };

  const choose = async (action: "known" | "unknown" | "skipped") => {
    if (!user || !current) return;
    await markLearn(user.id, current, action);
    setStep("back");
  };

  const next = () => {
    setStep("front");
    if (i + 1 < queue.length) {
      setI((x) => x + 1);
    } else {
      toast.success("复习结束 / Done");
      setOpen(false);
      setQueue([]);
      setI(0);
      load();
    }
  };

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Mistakes" zh="错题本" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与错题 / Admin has no mistakes</div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Mistakes" zh="错题本" />
        <div className="mt-3 text-sm text-muted-foreground">请先去 Plan 设置学习计划。</div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Mistakes" zh="错题本" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border-2 border-black/10 bg-white/50 px-3 py-2">
            <Checkbox checked={onlyToday} onCheckedChange={(v) => setOnlyToday(Boolean(v))} />
            <span className="text-sm">Today only / 只看今天</span>
          </label>
          <Button variant="outline" className="border-2" onClick={load}>
            Refresh
          </Button>
          <Button className="border-2 border-black/10 font-black" onClick={() => startReview(items.slice(0, 20).map((x) => x.w))}>
            Review Top 20 / 复习前20
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">排序：错误次数降序。来源：学习不认识 / 测试做错。</div>
      </Card>

      <Card className="border-2 border-black/10 bg-white/70 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="overflow-auto rounded-xl border-2 border-black/10 bg-white/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Word</TableHead>
                <TableHead>Meaning</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Wrong</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(({ p, w, totalWrong, source }) => (
                <TableRow key={`${p.bookId}::${p.word}`}> 
                  <TableCell className="font-semibold">{w.word}</TableCell>
                  <TableCell className="text-sm">{w.definition || ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {source === "learn" ? "Learn / 学习" : source === "quiz" ? "Quiz / 测试" : "Both / 两者"}
                  </TableCell>
                  <TableCell className="text-right font-black">{totalWrong}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" className="font-black" onClick={() => startReview([w])}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    暂无错题 / No mistakes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-2 max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Mistakes / 复习错题</DialogTitle>
          </DialogHeader>

          {current && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">
                  {i + 1}/{queue.length}
                </div>
                <Button variant="outline" className="border-2" onClick={() => setStep((s) => (s === "front" ? "back" : "front"))}>
                  Flip / 翻面
                </Button>
              </div>

              <QuickCard w={current} step={step} />

              <div className="grid gap-3 md:grid-cols-3">
                <Button size="lg" className="h-14 font-black bg-[oklch(0.80_0.20_200)] text-black" disabled={step === "back"} onClick={() => choose("known")}> 
                  Know
                  <div className="text-xs font-normal opacity-80">认识</div>
                </Button>
                <Button size="lg" className="h-14 font-black bg-[oklch(0.82_0.22_35)] text-black" disabled={step === "back"} onClick={() => choose("unknown")}> 
                  Don’t know
                  <div className="text-xs font-normal opacity-80">不认识</div>
                </Button>
                <Button size="lg" className="h-14 font-black bg-[oklch(0.92_0.12_95)] text-black" disabled={step === "back"} onClick={() => choose("skipped")}> 
                  Skip
                  <div className="text-xs font-normal opacity-80">跳过</div>
                </Button>
              </div>

              {step === "back" && (
                <div className="flex items-center justify-end">
                  <Button size="lg" className="h-12 font-black" onClick={next}>
                    Next / 下一题
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
