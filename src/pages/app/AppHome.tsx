import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BiTitle } from "@/components/Bilingual";

import { useAuth } from "@/contexts/AuthContext";
import { getPlan } from "@/lib/plan";
import { getOrCreateToday } from "@/lib/daily";
import { countMastered } from "@/lib/progress";
import type { Plan } from "@/lib/models";

function Ring({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-full border-2 border-black/10 bg-white/55 shadow-[6px_6px_0_rgba(0,0,0,0.12)]">
      <div
        className="absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(oklch(0.78 0.22 200) ${p}%, oklch(0.92 0 0 / 0.15) 0)` as any,
        }}
      />
      <div className="absolute inset-4 rounded-full bg-white/80" />
      <div className="relative text-xl font-black">{p}%</div>
    </div>
  );
}

export default function AppHome() {
  const { user } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [today, setToday] = useState<any>(null);
  const [mastered, setMastered] = useState(0);

  useEffect(() => {
    (async () => {
      if (!user || user.role === "admin") return;
      const p = await getPlan(user.id);
      setPlan(p);
      if (p) {
        setToday(await getOrCreateToday(user.id, p));
        setMastered(await countMastered(user.id));
      }
    })();
  }, [user]);

  const pct = useMemo(() => {
    if (!plan || !plan.totalWords) return 0;
    return Math.round((mastered / plan.totalWords) * 100);
  }, [mastered, plan]);

  if (!user) return null;

  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Dashboard" zh="首页仪表盘" />
        <div className="mt-3 text-sm text-muted-foreground">管理员请使用左侧导航进入后台管理。</div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Dashboard" zh="首页仪表盘" />
        <div className="mt-3 text-sm text-muted-foreground">你还没有计划。先去 Plan 设置，再回来开始闯关！</div>
        <div className="mt-4">
          <Link href="/app/plan">
            <Button size="lg" className="h-12 font-black">
              Go Plan / 去设置
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const learnedToday = today?.learnedToday ?? 0;
  const targetToday = today?.targetToday ?? plan.dailyTarget;
  const finished = learnedToday >= targetToday;

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Dashboard" zh="首页仪表盘" />
        <div className="mt-2 text-sm text-muted-foreground">今天也来一局！</div>

        <div className="mt-5 grid gap-4 md:grid-cols-[140px_1fr] md:items-center">
          <Ring pct={pct} />
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-2 border-black/10 bg-white/55 p-4">
              <div className="text-xs text-muted-foreground">Total / 累计学习</div>
              <div className="text-xl font-black">
                {mastered} / {plan.totalWords}
              </div>
            </Card>
            <Card className="border-2 border-black/10 bg-white/55 p-4">
              <div className="text-xs text-muted-foreground">Today / 今日已学</div>
              <div className="text-xl font-black">
                {learnedToday} / {targetToday}
              </div>
            </Card>
            <Card className="border-2 border-black/10 bg-white/55 p-4">
              <div className="text-xs text-muted-foreground">Streak / 连续学习</div>
              <div className="text-xl font-black">
                Day {today?.streakDayIndex ?? 1} / {today?.totalDays ?? 1}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/app/learn">
            <Button size="lg" className="h-12 font-black shadow-[4px_4px_0_rgba(0,0,0,0.18)]">
              {finished ? "Append / 追加学习" : "Start / 开始学习"}
            </Button>
          </Link>
          <Link href="/app/review">
            <Button size="lg" variant="outline" className="h-12 border-2 font-black">
              Review / 复习
            </Button>
          </Link>
          <Link href="/app/quiz">
            <Button size="lg" variant="secondary" className="h-12 border-2 border-black/10 font-black">
              Quiz / 测试
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
