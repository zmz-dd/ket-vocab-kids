import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { BiTitle } from "@/components/Bilingual";
import { useAuth } from "@/contexts/AuthContext";
import { AVATARS, createUserByAdmin, deleteUser, listUsers } from "@/lib/auth";
import { addCustomBook, enrichBookWords, importWordsToBook, listBooks } from "@/lib/books";

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("users");

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [uOpen, setUOpen] = useState(false);
  const [newU, setNewU] = useState({ username: "", password: "", avatarId: AVATARS[0].id });

  // Books
  const [books, setBooks] = useState<any[]>([]);
  const [bOpen, setBOpen] = useState(false);
  const [iOpen, setIOpen] = useState(false);
  const [newB, setNewB] = useState({ title: "", description: "" });
  const [importBookId, setImportBookId] = useState<string>("");
  const [importText, setImportText] = useState<string>("");

  const canUse = user?.role === "admin";

  const refreshUsers = async () => {
    const all = await listUsers();
    setUsers(all);
  };

  const refreshBooks = async () => {
    const all = await listBooks();
    setBooks(all.sort((a: any, b: any) => (b.isBuiltin ? 1 : 0) - (a.isBuiltin ? 1 : 0)));
    if (!importBookId && all.length) setImportBookId(all[0].id);
  };

  useEffect(() => {
    if (!canUse) return;
    refreshUsers();
    refreshBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  const nonAdminUsers = useMemo(() => users.filter((u) => u.role !== "admin"), [users]);

  if (!canUse) {
    return (
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Admin" zh="管理员后台" />
        <div className="mt-3 text-sm text-muted-foreground">仅管理员可访问 / Admin only</div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <BiTitle en="Admin Center" zh="管理员中心" />
        <div className="mt-2 text-sm text-muted-foreground">
          需求提醒：管理员账号不参与学习PK，仅用于后台管理。
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border-2 border-black/10 bg-white/60">
          <TabsTrigger value="users">Users / 用户</TabsTrigger>
          <TabsTrigger value="books">Books / 词书</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="border-2 border-black/10 bg-white/70 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Users / 用户管理</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-2" onClick={refreshUsers}>
                  Refresh
                </Button>

                <Dialog open={uOpen} onOpenChange={setUOpen}>
                  <DialogTrigger asChild>
                    <Button className="border-2 border-black/10 shadow-[4px_4px_0_rgba(0,0,0,0.18)]">Create</Button>
                  </DialogTrigger>
                  <DialogContent className="border-2">
                    <DialogHeader>
                      <DialogTitle>Create User / 创建用户</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Username / 用户名</Label>
                        <Input
                          value={newU.username}
                          onChange={(e) => setNewU((s) => ({ ...s, username: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Password / 密码</Label>
                        <Input
                          type="password"
                          value={newU.password}
                          onChange={(e) => setNewU((s) => ({ ...s, password: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Avatar / 头像</Label>
                        <Select value={newU.avatarId} onValueChange={(v) => setNewU((s) => ({ ...s, avatarId: v }))}>
                          <SelectTrigger className="border-2">
                            <SelectValue />
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
                      <Button
                        size="lg"
                        className="mt-1 h-11 font-black"
                        onClick={async () => {
                          try {
                            if (!newU.username.trim() || !newU.password.trim()) {
                              toast.error("请输入用户名和密码");
                              return;
                            }
                            await createUserByAdmin({
                              username: newU.username.trim(),
                              password: newU.password,
                              avatarId: newU.avatarId,
                            });
                            toast.success("Created / 已创建");
                            setNewU({ username: "", password: "", avatarId: AVATARS[0].id });
                            setUOpen(false);
                            await refreshUsers();
                          } catch (e: any) {
                            toast.error(e?.message || "失败");
                          }
                        }}
                      >
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-xl border-2 border-black/10 bg-white/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold">{u.username}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.role === "admin" ? (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (!confirm(`Delete ${u.username}?`)) return;
                              try {
                                await deleteUser(u.id);
                                toast.success("Deleted / 已删除");
                                await refreshUsers();
                              } catch (e: any) {
                                toast.error(e?.message || "失败");
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              删除用户会一并删除该用户的学习记录、进度和错题（本地 IndexedDB）。
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="books" className="mt-4">
          <Card className="border-2 border-black/10 bg-white/70 p-4 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Books / 词书管理</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-2" onClick={refreshBooks}>
                  Refresh
                </Button>

                <Dialog open={bOpen} onOpenChange={setBOpen}>
                  <DialogTrigger asChild>
                    <Button className="border-2 border-black/10 shadow-[4px_4px_0_rgba(0,0,0,0.18)]">New Book</Button>
                  </DialogTrigger>
                  <DialogContent className="border-2">
                    <DialogHeader>
                      <DialogTitle>New Book / 新建词书名录</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Title / 标题</Label>
                        <Input value={newB.title} onChange={(e) => setNewB((s) => ({ ...s, title: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Description / 描述</Label>
                        <Input
                          value={newB.description}
                          onChange={(e) => setNewB((s) => ({ ...s, description: e.target.value }))}
                        />
                      </div>
                      <Button
                        size="lg"
                        className="h-11 font-black"
                        onClick={async () => {
                          try {
                            if (!newB.title.trim()) {
                              toast.error("请输入标题");
                              return;
                            }
                            const id = `custom_${nanoid(8)}`;
                            await addCustomBook({ id, title: newB.title.trim(), description: newB.description.trim() });
                            toast.success("Created / 已创建");
                            setNewB({ title: "", description: "" });
                            setBOpen(false);
                            await refreshBooks();
                            setImportBookId(id);
                          } catch (e: any) {
                            toast.error(e?.message || "失败");
                          }
                        }}
                      >
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={iOpen} onOpenChange={setIOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="border-2 border-black/10">
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-2 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import Words / 导入单词（每行一个）</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Book / 词书</Label>
                        <Select value={importBookId} onValueChange={setImportBookId}>
                          <SelectTrigger className="border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {books.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.title} {b.isBuiltin ? "(内置)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Words (.txt) / 单词列表</Label>
                        <Textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          rows={10}
                          placeholder={`apple\nbook\ncat\n...`}
                        />
                      </div>
                      <Button
                        size="lg"
                        className="h-11 font-black"
                        onClick={async () => {
                          try {
                            if (!importBookId) {
                              toast.error("请选择词书");
                              return;
                            }
                            const r = await importWordsToBook({ bookId: importBookId, text: importText });
                            toast.success(`Imported ${r.added}`);
                            setImportText("");
                            setIOpen(false);
                            await refreshBooks();
                          } catch (e: any) {
                            toast.error(e?.message || "失败");
                          }
                        }}
                      >
                        Import
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        提示：导入后可点击“补全 Enrich”联网补充音标/例句（失败会留空，不显示 unknown）。
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-xl border-2 border-black/10 bg-white/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title / 标题</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold">{b.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.isBuiltin ? "Builtin / 内置" : "Custom / 自定义"}</TableCell>
                      <TableCell>{b.wordCount ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2"
                          onClick={async () => {
                            try {
                              toast.loading("Enriching...", { id: "enrich" });
                              const r = await enrichBookWords(b.id, 30);
                              toast.success(`Enrich ok:${r.ok} fail:${r.fail}`, { id: "enrich" });
                            } catch (e: any) {
                              toast.error(e?.message || "失败", { id: "enrich" });
                            }
                          }}
                        >
                          Enrich
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-2 border-black/10 bg-white/60 p-4 text-xs text-muted-foreground">
        说明：本项目是纯前端静态站点，所有数据仅保存在当前浏览器的 IndexedDB 中（刷新不丢，但换电脑/清缓存会消失）。
      </Card>
    </div>
  );
}
