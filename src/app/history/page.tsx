"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type DreamEntryListItem = {
  id: string;
  dreamText: string;
  style: string | null;
  createdAt: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<DreamEntryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      const data = (await res.json()) as
        | { items: DreamEntryListItem[] }
        | { error: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error : "加载失败。");
      }
      if (!("items" in data)) throw new Error("返回格式不正确。");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生未知错误。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>历史记录</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            刷新
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
            去解梦
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            暂无历史记录。去主页生成一次解梦结果吧。
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {it.style ? <Badge variant="secondary">{it.style}</Badge> : null}
                    <div className="text-xs text-muted-foreground">
                      {new Date(it.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                </div>
                <div className="mt-2 line-clamp-3 text-sm leading-6">
                  {it.dreamText}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

