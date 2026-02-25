import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BiTitle } from "@/components/Bilingual";

import { useAuth } from "@/contexts/AuthContext";
import { getPlan } from "@/lib/plan";
import { getOrCreateToday, incrementLearned } from "@/lib/daily";
import { pickWords } from "@/lib/taskPicker";
import { markLearn } from "@/lib/progress";
import { playAudioOrSpeak } from "@/lib/speak";
import type { Plan, WordEntry } from "@/lib/models";

const BATCH_SIZE = 10;

type Step = "front" | "back";

function FlashCard({ w, step }: { w: WordEntry; step: Step }) {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div
        className={`relative rounded-[2rem] border-2 border-black/15 bg-white/70 p-6 shadow-[14px_14px_0_rgba(0,0,0,0.14)] transition-transform duration-500 [transform-style:preserve-3d] ${
          step === "back" ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* front */}
        <div className="[backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-4xl font-black tracking-tight">{w.word}</div>
              <div className="mt-1 text-sm text-muted-foreground">{w.phonetic || ""}</div>
            </div>
            <Button
              variant="outline"
              className="border-2"
              onClick={() => playAudioOrSpeak(w.audio, w.word)}
              title="Speak"
            >
              Speak
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-dashed border-black/15 bg-white/50 p-4 text-sm text-muted-foreground">
            Tap a big button below…
            <div className="text-xs">点击下面的大按钮开始闯关</div>
          </div>
        </div>

        {/* back */}
        <div className="absolute inset-0 p-6 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-3xl font-black tracking-tight">{w.word}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {w.pos ? `${w.pos} · ` : ""}
                {w.phonetic || ""}
              </div>
            </div>
            <Button variant="outline" className="border-2" onClick={() => playAudioOrSpeak(w.audio, w.word)}>
              Speak
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border-2 border-black/10 bg-[oklch(0.97_0.06_95)] p-4">
            <div className="text-sm font-semibold">Meaning / 中文</div>
            <div className="mt-1 text-lg font-black">{w.definition || "（待补充）"}</div>
          </div>

          <div className="mt-4 rounded-2xl border-2 border-black/10 bg-white/55 p-4">
            <div className="text-sm font-semibold">Example / 例句</div>
            <div className="mt-2 text-sm">{w.example || ""}</div>
            <div className="mt-3">
              <Button
                variant="secondary"
                className="border-2 border-black/10"
                onClick={() => playAudioOrSpeak(w.exampleAudio, w.example || w.word)}
              >
                Listen / 听
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  const { user } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [today, setToday] = useState<any>(null);
  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("front");
  const [lastAction, setLastAction] = useState<"known" | "unknown" | "skipped" | null>(null);

  const current = queue[index];

  const doneInBatch = index;
  const batchTotal = queue.length;

  const progressPct = useMemo(() => {
    if (!today) return 0;
    const t = Math.max(1, today.targetToday || 1);
    const v = Math.min(100, Math.round(((today.learnedToday || 0) / t) * 100));
    return Number.isFinite(v) ? v : 0;
  }, [today]);

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      const p = await getPlan(user.id);
      setPlan(p);
      if (p) {
        const t = await getOrCreateToday(user.id, p);
        setToday(t);
      }
    })();
  }, [user]);

  const start = async (mode: "plan" | "append") => {
    if (!user || !plan) return;
    const t = await getOrCreateToday(user.id, plan);
    setToday(t);

    const need = mode === "plan" ? Math.max(0, (t.targetToday || 0) - (t.learnedToday || 0)) : BATCH_SIZE;
    if (need <= 0 && mode === "plan") {
      toast.success("今日目标已完成！可以点 ‘追加学习’\nDone! Tap Append");
      return;
    }

    const words = await pickWords({ userId: user.id, plan, count: Math.min(BATCH_SIZE, need || BATCH_SIZE), mode });
    if (!words.length) {
      toast.error("没有可学的单词了（可能已经全部学完）");
      return;
    }
    setQueue(words);
    setIndex(0);
    setStep("front");
    setLastAction(null);
  };

  const handleChoice = async (action: "known" | "unknown" | "skipped") => {
    if (!user || !plan || !current) return;
    setLastAction(action);

    await markLearn(user.id, current, action);
    const t = await incrementLearned(user.id, plan, current);
    setToday(t);

    setStep("back");
  };

  const next = async () => {
    setStep("front");
    setLastAction(null);

    // next item
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
      return;
    }

    // end of batch
    if (!user || !plan) return;
    const t = await getOrCreateToday(user.id, plan);
    setToday(t);

    const remaining = Math.max(0, (t.targetToday || 0) - (t.learnedToday || 0));
    const cont = confirm(
      `本批完成！\nBatch done.\n\n今日还需学习：${remaining} 个\nContinue?`
    );

    if (!cont) {
      setQueue([]);
      setIndex(0);
      return;
    }

    const mode: "plan" | "append" = remaining > 0 ? "plan" : "append";
    await start(mode);
  };

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Learn" zh="学习模式" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与学习 / Admin does not learn</div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Learn" zh="学习模式" />
        <div className="mt-3 text-sm text-muted-foreground">请先去 Plan 设置学习计划。</div>
      </Card>
    );
  }

  const finishedToday = today && (today.learnedToday || 0) >= (today.targetToday || 0);

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Learn" zh="学习模式" />
        <div className="mt-3 grid gap-3 md:grid-cols-3 md:items-center">
          <div className="rounded-2xl border-2 border-black/10 bg-white/55 p-3">
            <div className="text-xs text-muted-foreground">Today / 今日已学</div>
            <div className="text-xl font-black">
              {today?.learnedToday ?? 0} / {today?.targetToday ?? plan.dailyTarget}
            </div>
          </div>
          <div className="md:col-span-2">
            <Progress value={progressPct} className="h-4 border-2 border-black/10 bg-white/60" />
            <div className="mt-1 text-xs text-muted-foreground">Progress / 完成度：{progressPct}%</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            size="lg"
            className="h-12 font-black shadow-[4px_4px_0_rgba(0,0,0,0.18)]"
            onClick={() => start(finishedToday ? "append" : "plan")}
          >
            {finishedToday ? "Append / 追加学习" : "Start / 开始学习"}
          </Button>
          <Button variant="outline" className="h-12 border-2" onClick={() => setQueue([])}>
            Stop
          </Button>
        </div>
      </Card>

      {queue.length > 0 && current && (
        <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              Batch / 批次：{doneInBatch + 1} / {batchTotal}
            </div>
            <div className="text-xs text-muted-foreground">每批 {BATCH_SIZE} 个（最后一批可能不足）</div>
          </div>

          <div className="mt-5">
            <FlashCard w={current} step={step} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Button
              size="lg"
              className="h-14 text-base font-black bg-[oklch(0.80_0.20_200)] text-black hover:bg-[oklch(0.76_0.22_200)]"
              disabled={step === "back"}
              onClick={() => handleChoice("known")}
            >
              Know
              <div className="text-xs font-normal opacity-80">认识</div>
            </Button>
            <Button
              size="lg"
              className="h-14 text-base font-black bg-[oklch(0.82_0.22_35)] text-black hover:bg-[oklch(0.78_0.24_35)]"
              disabled={step === "back"}
              onClick={() => handleChoice("unknown")}
            >
              Don’t know
              <div className="text-xs font-normal opacity-80">不认识</div>
            </Button>
            <Button
              size="lg"
              className="h-14 text-base font-black bg-[oklch(0.92_0.12_95)] text-black hover:bg-[oklch(0.90_0.14_95)]"
              disabled={step === "back"}
              onClick={() => handleChoice("skipped")}
            >
              Skip
              <div className="text-xs font-normal opacity-80">跳过</div>
            </Button>
          </div>

          {step === "back" && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {lastAction === "unknown" ? "已记录为错题，会更快复习" : "已学✅ 将按记忆曲线复习"}
              </div>
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
