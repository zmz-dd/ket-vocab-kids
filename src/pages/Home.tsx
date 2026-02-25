import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AVATARS, login, registerUser } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { BiTitle } from "@/components/Bilingual";
import { Sparkles } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { user, loading, refresh } = useAuth();
  const [, setLoc] = useLocation();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);

  useEffect(() => {
    if (!loading && user) setLoc(user.role === "admin" ? "/admin" : "/app");
  }, [loading, user, setLoc]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,oklch(0.98_0.12_95)_0%,transparent_35%),radial-gradient(circle_at_88%_18%,oklch(0.92_0.18_210)_0%,transparent_45%),radial-gradient(circle_at_60%_90%,oklch(0.94_0.20_35)_0%,transparent_50%),linear-gradient(180deg,oklch(0.99_0.06_95),oklch(0.98_0.04_120))] p-4">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-black/10 bg-white/60 px-4 py-2 shadow-[8px_8px_0_rgba(0,0,0,0.14)]">
            <Sparkles className="h-5 w-5" />
            <div>
              <div className="font-black tracking-tight">KET 一起学</div>
              <div className="text-xs text-muted-foreground">Vocab Kids</div>
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
            Learn words
            <br />
            like a game.
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            英文单词像闯关一样好玩：学习 / 复习 / 测试 / 错题 / 排行榜，一套搞定。
          </p>

          <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
            <Card className="border-2 border-black/10 bg-white/55 p-4 shadow-[8px_8px_0_rgba(0,0,0,0.12)]">
              <div className="text-sm font-semibold">Big Buttons</div>
              <div className="text-xs text-muted-foreground">大按钮，孩子不费眼</div>
            </Card>
            <Card className="border-2 border-black/10 bg-white/55 p-4 shadow-[8px_8px_0_rgba(0,0,0,0.12)]">
              <div className="text-sm font-semibold">Local First</div>
              <div className="text-xs text-muted-foreground">数据保存在浏览器</div>
            </Card>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            管理员默认账号：zhx / 1989（仅用于后台管理）
          </div>
        </div>

        <Card className="border-2 border-black/10 bg-white/65 p-5 shadow-[12px_12px_0_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-between">
            <BiTitle en={mode === "login" ? "Login" : "Register"} zh={mode === "login" ? "登录" : "注册"} />
            <Button
              variant="outline"
              className="border-2"
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
            >
              {mode === "login" ? "Create" : "Back"}
            </Button>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>Username / 用户名</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tom" />
            </div>
            <div className="grid gap-2">
              <Label>Password / 密码</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
              />
            </div>

            {mode === "register" && (
              <div className="grid gap-2">
                <Label>Avatar / 头像</Label>
                <Select value={avatarId} onValueChange={setAvatarId}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVATARS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              size="lg"
              className="h-12 text-base font-black shadow-[4px_4px_0_rgba(0,0,0,0.18)]"
              onClick={async () => {
                try {
                  if (!username.trim() || !password.trim()) {
                    toast.error("请输入用户名和密码");
                    return;
                  }
                  if (mode === "login") {
                    await login(username.trim(), password);
                    toast.success("Welcome! / 登录成功");
                  } else {
                    await registerUser({ username: username.trim(), password, avatarId });
                    toast.success("Go! / 注册成功");
                  }
                  await refresh();
                } catch (e: any) {
                  toast.error(e?.message || "失败");
                }
              }}
            >
              {mode === "login" ? "Start / 开始" : "Create / 创建"}
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-dashed border-black/15 bg-white/40 p-3 text-xs text-muted-foreground">
            发音说明：单词和例句默认使用浏览器 TTS（离线也能用）；如果词库里有音频链接，会优先播放音频。
          </div>
        </Card>
      </div>
    </div>
  );
}
