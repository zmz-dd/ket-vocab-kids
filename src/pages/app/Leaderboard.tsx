import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BiTitle } from "@/components/Bilingual";

import { useAuth } from "@/contexts/AuthContext";
import { listUsers } from "@/lib/auth";
import { countMastered } from "@/lib/progress";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<{ userId: string; username: string; mastered: number }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user || user.role === "admin") return;
    setLoading(true);
    const users = (await listUsers()).filter((u) => u.role !== "admin");

    const res: Array<{ userId: string; username: string; mastered: number }> = [];
    for (const u of users) {
      const m = await countMastered(u.id);
      res.push({ userId: u.id, username: u.username, mastered: m });
    }

    res.sort((a, b) => b.mastered - a.mastered || a.username.localeCompare(b.username));
    setRows(res);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const myRank = useMemo(() => {
    if (!user) return null;
    const idx = rows.findIndex((r) => r.userId === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [rows, user]);

  if (!user) return null;
  if (user.role === "admin") {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Leaderboard" zh="排行榜" />
        <div className="mt-3 text-sm text-muted-foreground">管理员不参与PK / Admin excluded</div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BiTitle en="Leaderboard" zh="排行榜" />
          <Button variant="outline" className="border-2" onClick={load} disabled={loading}>
            {loading ? "Loading" : "Refresh"}
          </Button>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          PK 标准：掌握单词数（认识 / 测试答对 / 错题纠正学对）。
          {myRank ? (
            <span className="ml-2">你的排名：第 {myRank} 名</span>
          ) : null}
        </div>
      </Card>

      <Card className="border-2 border-black/10 bg-white/70 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="overflow-auto rounded-xl border-2 border-black/10 bg-white/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Mastered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.userId} className={r.userId === user.id ? "bg-[oklch(0.92_0.12_95)]" : ""}>
                  <TableCell className="font-black">{i + 1}</TableCell>
                  <TableCell className="font-semibold">{r.username}</TableCell>
                  <TableCell className="text-right font-black">{r.mastered}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    暂无数据 / No data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
