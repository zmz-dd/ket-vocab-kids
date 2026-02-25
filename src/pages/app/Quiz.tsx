import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import { BiTitle } from "@/components/Bilingual";
import { useAuth } from "@/contexts/AuthContext";
import { getPlan } from "@/lib/plan";
import { getDB } from "@/lib/db";
import { listUserProgress, markQuiz } from "@/lib/progress";
import { getOrCreateToday } from "@/lib/daily";
import { isToday, playAudioOrSpeak } from "@/lib/speak";
import type { Plan, WordEntry, WordProgress } from "@/lib/models";

type Source = "allLearned" | "todayLearned" | "selectedBooks" | "allMistakes" | "todayMistakes";

type Q = {
  word: WordEntry;
  options: string[];
  answer: string;
};

function sample<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export default function QuizPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);

  const [source, setSource] = useState<Source>("allLearned");
  const [count, setCount] = useState(10);

  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const current = questions[idx];

  const pct = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((idx / questions.length) * 100);
  }, [idx, questions.length]);

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      const p = await getPlan(user.id);
      setPlan(p);
    })();
  }, [user]);

  const buildPool = async (): Promise<WordEntry[]> => {
    if (!user || !plan) return [];
    const db = await getDB();
    const prog = (await listUserProgress(user.id)) as any as WordProgress[];

    const allKeys = new Set(
      prog
        .filter((p: any) => plan.bookIds.includes(p.bookId))
        .map((p: any) => `${p.bookId}::${String(p.word).toLowerCase()}`)
    );

    const mistakeKeys = new Set(
      prog
        .filter(
          (p: any) =>
            plan.bookIds.includes(p.bookId) && ((p.wrongLearnCount || 0) + (p.wrongQuizCount || 0) > 0)
        )
        .map((p: any) => `${p.bookId}::${String(p.word).toLowerCase()}`)
    );

    const today = await getOrCreateToday(user.id, plan);
    const todayLearned = new Set((today.learnedWordKeys || []).map(String));

    const todayMistakes = new Set(
      prog
        .filter((p: any) => plan.bookIds.includes(p.bookId) && isToday(p.lastWrongAt))
        .map((p: any) => `${p.bookId}::${String(p.word).toLowerCase()}`)
    );

    let keys: Set<string>;
    switch (source) {
      case "allLearned":
        keys = allKeys;
        break;
      case "todayLearned":
        keys = todayLearned;
        break;
      case "selectedBooks": {
        const all = await Promise.all(plan.bookIds.map((id) => db.getAllFromIndex("words", "by-book", id)));
        return (all.flat() as any as WordEntry[]).filter((w) => w.definition);
      }
      case "allMistakes":
        keys = mistakeKeys;
        break;
      case "todayMistakes":
        keys = todayMistakes;
        break;
    }

    const words: WordEntry[] = [];
    for (const k of Array.from(keys)) {
      const w = (await db.get("words", k)) as any;
      if (w) words.push(w);
    }
    return words.filter((w) => w.definition);
  };

  const start = async () => {
    if (!user || !plan) return;
    const pool = await buildPool();
    if (pool.length < 4) {
      toast.error("可用单词太少（至少需要 4 个）");
      return;
    }

    const picks = sample(pool, Math.min(count, pool.length));
    const qs: Q[] = picks.map((w) => {
      const wrong = sample(
        pool.filter((x) => x.word !== w.word).map((x) => x.definition || ""),
        3
      );
      const options = sample([w.definition, ...wrong], 4);
      return { word: w, options, answer: w.definition };
    });

    setQuestions(qs);
    setIdx(0);
    setRevealed(false);
    setCorrectCount(0);
  };

  const choose = async (opt: string) => {
    if (!user || !current) return;
    if (revealed) return;

    const correct = opt === current.answer;
    setRevealed(true);
    if (correct) setCorrectCount((c) => c + 1);

    await markQuiz(user.id, current.word, correct);
  };

  const next = () => {
    setRevealed(false);
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
    } else {
      toast.success(`Done! 正确 ${correctCount}/${questions.length}`);
      setQuestions([]);
      setIdx(0);
    }
  };

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Quiz" zh="测试模式" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与测试 / Admin does not quiz</div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Quiz" zh="测试模式" />
        <div className="mt-3 text-sm text-muted-foreground">请先去 Plan 设置学习计划。</div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Quiz" zh="测试模式" />
        <div className="mt-4 grid gap-4 md:grid-cols-3 md:items-end">
          <div className="grid gap-2">
            <Label>Source / 出题范围</Label>
            <Select value={source} onValueChange={(v) => setSource(v as any)}>
              <SelectTrigger className="border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allLearned">All learned / 全部已学</SelectItem>
                <SelectItem value="todayLearned">Today learned / 当天已学</SelectItem>
                <SelectItem value="selectedBooks">Selected books / 指定单词本</SelectItem>
                <SelectItem value="allMistakes">All mistakes / 全部错题</SelectItem>
                <SelectItem value="todayMistakes">Today mistakes / 当天错题</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Count / 数量</Label>
            <Input type="number" min={5} value={count} onChange={(e) => setCount(Number(e.target.value))} className="border-2" />
          </div>
          <Button size="lg" className="h-12 font-black" onClick={start}>
            Start / 开始
          </Button>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">每题四选一：选择中文释义。答对会计入“已学/掌握”。</div>
      </Card>

      {questions.length > 0 && current && (
        <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {idx + 1}/{questions.length}
            </div>
            <div className="w-56">
              <Progress value={pct} className="h-3 border-2 border-black/10 bg-white/60" />
            </div>
          </div>

          <div className="mt-5 rounded-[2rem] border-2 border-black/15 bg-white/70 p-6 shadow-[12px_12px_0_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-4xl font-black tracking-tight">{current.word.word}</div>
                <div className="mt-1 text-sm text-muted-foreground">{current.word.phonetic || ""}</div>
              </div>
              <Button variant="outline" className="border-2" onClick={() => playAudioOrSpeak(current.word.audio, current.word.word)}>
                Speak
              </Button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {current.options.map((opt) => {
                const isAns = opt === current.answer;
                const picked = revealed && isAns;
                return (
                  <Button
                    key={opt}
                    variant={revealed ? (isAns ? "default" : "outline") : "outline"}
                    className={`h-auto min-h-12 justify-start whitespace-normal border-2 text-left ${
                      revealed
                        ? isAns
                          ? "bg-[oklch(0.80_0.20_200)] text-black"
                          : "opacity-70"
                        : ""
                    }`}
                    onClick={() => choose(opt)}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">Answer / 答案：{current.answer}</div>
                <Button size="lg" className="h-12 font-black" onClick={next}>
                  Next / 下一题
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
