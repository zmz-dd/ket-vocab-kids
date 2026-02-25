import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BiTitle } from "@/components/Bilingual";

import { useAuth } from "@/contexts/AuthContext";
import { getPlan } from "@/lib/plan";
import { listDueReview } from "@/lib/progress";
import { getDB } from "@/lib/db";
import { markLearn } from "@/lib/progress";
import { playAudioOrSpeak } from "@/lib/speak";
import type { Plan, WordEntry } from "@/lib/models";

type Step = "front" | "back";

function ReviewCard({ w, step }: { w: WordEntry; step: Step }) {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div
        className={`relative rounded-[2rem] border-2 border-black/15 bg-white/70 p-6 shadow-[14px_14px_0_rgba(0,0,0,0.14)] transition-transform duration-500 [transform-style:preserve-3d] ${
          step === "back" ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="[backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-4xl font-black tracking-tight">{w.word}</div>
              <div className="mt-1 text-sm text-muted-foreground">{w.phonetic || ""}</div>
            </div>
            <Button variant="outline" className="border-2" onClick={() => playAudioOrSpeak(w.audio, w.word)}>
              Speak
            </Button>
          </div>
          <div className="mt-5 rounded-2xl border-2 border-dashed border-black/15 bg-white/50 p-4 text-sm text-muted-foreground">
            Try to remember first…
            <div className="text-xs">先想一想，再翻答案</div>
          </div>
        </div>

        <div className="absolute inset-0 p-6 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-3xl font-black tracking-tight">{w.word}</div>
              <div className="mt-1 text-sm text-muted-foreground">{w.definition || "（待补充）"}</div>
            </div>
            <Button variant="outline" className="border-2" onClick={() => playAudioOrSpeak(w.audio, w.word)}>
              Speak
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border-2 border-black/10 bg-white/55 p-4">
            <div className="text-sm font-semibold">Example / 例句</div>
            <div className="mt-2 text-sm">{w.example || ""}</div>
            <div className="mt-3">
              <Button variant="secondary" className="border-2 border-black/10" onClick={() => playAudioOrSpeak(w.exampleAudio, w.example || w.word)}>
                Listen / 听
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { user } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("front");

  const current = queue[index];

  const pct = useMemo(() => {
    if (!queue.length) return 0;
    return Math.round((index / queue.length) * 100);
  }, [index, queue.length]);

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      const p = await getPlan(user.id);
      setPlan(p);
    })();
  }, [user]);

  const loadDue = async () => {
    if (!user || !plan) return;
    const due = await listDueReview(user.id, plan.bookIds, 30);
    if (!due.length) {
      toast.success("暂无需要复习的单词 / Nothing due");
      setQueue([]);
      setIndex(0);
      return;
    }

    const db = await getDB();
    const words: WordEntry[] = [];
    for (const p of due as any[]) {
      const key = `${p.bookId}::${String(p.word).toLowerCase()}`;
      const w = (await db.get("words", key)) as any;
      if (w) words.push(w);
    }

    setQueue(words);
    setIndex(0);
    setStep("front");
  };

  const choose = async (action: "known" | "unknown" | "skipped") => {
    if (!user || !current) return;
    await markLearn(user.id, current, action);
    setStep("back");
  };

  const next = () => {
    setStep("front");
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      toast.success("复习完成！/ Review done");
      setQueue([]);
      setIndex(0);
    }
  };

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Review" zh="复习模式" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与复习 / Admin does not review</div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Review" zh="复习模式" />
        <div className="mt-3 text-sm text-muted-foreground">请先去 Plan 设置学习计划。</div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Review" zh="复习模式" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="lg" className="h-12 font-black" onClick={loadDue}>
            Start / 开始复习
          </Button>
          <div className="text-xs text-muted-foreground">系统按记忆曲线自动筛选“到点需要复习”的单词。</div>
        </div>
      </Card>

      {queue.length > 0 && current && (
        <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {index + 1} / {queue.length}
            </div>
            <div className="w-48">
              <Progress value={pct} className="h-3 border-2 border-black/10 bg-white/60" />
            </div>
          </div>

          <div className="mt-5">
            <ReviewCard w={current} step={step} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Button size="lg" className="h-14 text-base font-black bg-[oklch(0.80_0.20_200)] text-black" disabled={step === "back"} onClick={() => choose("known")}> 
              Know
              <div className="text-xs font-normal opacity-80">认识</div>
            </Button>
            <Button size="lg" className="h-14 text-base font-black bg-[oklch(0.82_0.22_35)] text-black" disabled={step === "back"} onClick={() => choose("unknown")}> 
              Don’t know
              <div className="text-xs font-normal opacity-80">不认识</div>
            </Button>
            <Button size="lg" className="h-14 text-base font-black bg-[oklch(0.92_0.12_95)] text-black" disabled={step === "back"} onClick={() => choose("skipped")}> 
              Skip
              <div className="text-xs font-normal opacity-80">跳过</div>
            </Button>
          </div>

          {step === "back" && (
            <div className="mt-4 flex items-center justify-end">
              <Button size="lg" className="h-12 font-black" onClick={next}>
                Next / 下一题
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
