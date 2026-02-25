// 设计宣言（Memphis Kids Dashboard）
// - “贴纸侧边栏” + “任务主舞台”
// - 导航永远可达：不让孩子迷路

import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { logout } from "@/lib/auth";
import { Bi } from "@/components/Bilingual";
import { BookOpen, Crown, Gamepad2, Home, ListChecks, Shield, Sparkles, Swords, Trophy } from "lucide-react";
import type { User } from "@/lib/models";

function NavItem({ href, icon, en, zh }: { href: string; icon: any; en: string; zh: string }) {
  const [loc] = useLocation();
  const active = loc === href;
  const Icon = icon;
  return (
    <Link href={href}>
      <a
        className={`group flex items-center gap-3 rounded-xl border-2 px-3 py-2 transition ${
          active
            ? "bg-[oklch(0.92_0.12_95)] border-[oklch(0.45_0.18_250)]"
            : "bg-white/60 border-black/10 hover:border-black/30 hover:bg-white"
        }`}
      >
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl border-2 shadow-[3px_3px_0_rgba(0,0,0,0.18)] ${
            active ? "bg-[oklch(0.78_0.22_200)] border-black/30" : "bg-[oklch(0.96_0.08_95)] border-black/20"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <Bi en={en} zh={zh} />
      </a>
    </Link>
  );
}

export default function AppShell({ user, children }: PropsWithChildren<{ user: User }>) {
  const [loc, setLoc] = useLocation();
  const [timeText, setTimeText] = useState(() => new Date().toLocaleString());

  useEffect(() => {
    const t = setInterval(() => setTimeText(new Date().toLocaleString()), 1000 * 10);
    return () => clearInterval(t);
  }, []);

  const nav = useMemo(() => {
    const base = [
      { href: "/app", icon: Home, en: "Home", zh: "首页仪表盘" },
      { href: "/app/plan", icon: ListChecks, en: "Plan", zh: "学习计划" },
      { href: "/app/learn", icon: Gamepad2, en: "Learn", zh: "学习模式" },
      { href: "/app/review", icon: Sparkles, en: "Review", zh: "复习模式" },
      { href: "/app/quiz", icon: Swords, en: "Quiz", zh: "测试模式" },
      { href: "/app/mistakes", icon: BookOpen, en: "Mistakes", zh: "错题本" },
      { href: "/app/stats", icon: Trophy, en: "Stats", zh: "统计" },
      { href: "/app/leaderboard", icon: Crown, en: "Leaderboard", zh: "排行榜" },
    ];
    if (user.role === "admin") {
      base.splice(2, 0, { href: "/admin", icon: Shield, en: "Admin", zh: "管理员后台" } as any);
    }
    return base;
  }, [user.role]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_15%,oklch(0.98_0.12_95)_0%,transparent_38%),radial-gradient(circle_at_90%_10%,oklch(0.92_0.18_210)_0%,transparent_40%),radial-gradient(circle_at_80%_90%,oklch(0.94_0.20_35)_0%,transparent_45%),linear-gradient(180deg,oklch(0.99_0.06_95),oklch(0.98_0.04_120))]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-[320px_1fr] md:p-6">
        <Card className="relative overflow-hidden border-2 border-black/10 bg-white/55 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.15)] backdrop-blur">
          <div className="absolute -right-10 -top-10 h-40 w-40 rotate-12 rounded-[2rem] bg-[oklch(0.78_0.24_35)] opacity-30" />
          <div className="absolute -left-12 bottom-10 h-36 w-36 -rotate-6 rounded-[2rem] bg-[oklch(0.80_0.20_200)] opacity-25" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="font-black text-xl tracking-tight">Vocab Kids</div>
              <div className="text-xs text-muted-foreground">KET 一起学</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-2"
              onClick={() => {
                logout();
                toast.success("Bye! / 已退出");
                setLoc("/");
              }}
            >
              Logout
            </Button>
          </div>

          <div className="relative mt-4 rounded-2xl border-2 border-black/10 bg-white/60 p-3">
            <div className="text-sm font-semibold">{user.username}</div>
            <div className="text-xs text-muted-foreground">{user.role === "admin" ? "Admin / 管理员" : "Player / 学员"}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">{timeText}</div>
          </div>

          <div className="relative mt-4 flex flex-col gap-2">
            {nav.map((n: any) => (
              <NavItem key={n.href} href={n.href} icon={n.icon} en={n.en} zh={n.zh} />
            ))}
          </div>

          <div className="relative mt-4 text-xs text-muted-foreground">
            Tips: 点击按钮后会读音 / Tap to speak.
          </div>
        </Card>

        <main className="min-h-[70vh]">{children}</main>
      </div>
    </div>
  );
}
