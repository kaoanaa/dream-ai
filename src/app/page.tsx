"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DreamSymbol = {
  name: string;
  meaning: string;
  evidenceFromText: string;
};

type DreamResult = {
  summary: string;
  symbols: DreamSymbol[];
  emotions: string[];
  possibleTriggers: string[];
  advice: string[];
  questionsToAskUser: string[];
  disclaimer: string;
};

const STYLE_OPTIONS = [
  { value: "gentle_rational", label: "温柔理性" },
  { value: "jungian_symbols", label: "象征/原型（偏荣格）" },
  { value: "cbt_practical", label: "现实压力/应对建议（偏 CBT）" },
] as const;

export default function Home() {
  const [dreamText, setDreamText] = useState("");
  const [style, setStyle] = useState<(typeof STYLE_OPTIONS)[number]["value"]>(
    "gentle_rational",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DreamResult | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => {
    const t = dreamText.trim();
    return t.length >= 10 && t.length <= 5000;
  }, [dreamText]);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamText, style, locale: "zh-CN" }),
      });

      const data = (await res.json()) as
        | { entryId: string; result: DreamResult }
        | { error: string };

      if (!res.ok) {
        const message = "error" in data ? data.error : "请求失败，请稍后再试。";
        throw new Error(message);
      }

      if (!("result" in data)) throw new Error("返回格式不正确。");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生未知错误。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <section className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>输入你的梦</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">风格</div>
              <Select
                value={style}
                onValueChange={(v) =>
                  setStyle(v as (typeof STYLE_OPTIONS)[number]["value"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择风格" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">梦境内容</div>
                <div className="text-xs text-muted-foreground">
                  {dreamText.trim().length}/5000
                </div>
              </div>
              <Textarea
                value={dreamText}
                onChange={(e) => setDreamText(e.target.value)}
                placeholder="尽量写具体：场景、人物、情绪、反复出现的物件/动物、醒来后的感受……"
                className="min-h-44 resize-y"
              />
              <div className="text-xs text-muted-foreground">
                至少 10 个字；建议包含你醒来后的情绪与现实处境线索。
              </div>
            </div>

            <Button disabled={!canSubmit || loading} onClick={onSubmit}>
              {loading ? "解读中…" : "开始解梦"}
            </Button>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>生成失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="md:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>解梦结果</CardTitle>
              <Button
                variant="secondary"
                disabled={!result}
                onClick={async () => {
                  if (!result) return;
                  await navigator.clipboard.writeText(
                    JSON.stringify(result, null, 2),
                  );
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "已复制" : "复制 JSON"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            {!result ? (
              <div className="text-sm text-muted-foreground">
                结果会以结构化方式呈现：摘要、象征元素、可能情绪/压力源、建议与可追问问题。
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">摘要</div>
                  <div className="leading-7">{result.summary}</div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">象征元素</div>
                  <div className="grid gap-3">
                    {result.symbols?.length ? (
                      result.symbols.map((s, idx) => (
                        <div
                          key={`${s.name}-${idx}`}
                          className="rounded-lg border p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{s.name}</Badge>
                            <div className="text-sm text-muted-foreground">
                              {s.meaning}
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">
                              证据：
                            </span>{" "}
                            {s.evidenceFromText}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        暂无
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">情绪</div>
                  <div className="flex flex-wrap gap-2">
                    {result.emotions?.length ? (
                      result.emotions.map((x) => (
                        <Badge key={x} variant="outline">
                          {x}
                        </Badge>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">暂无</div>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">可能触发点</div>
                  <ul className="list-disc pl-5 text-sm leading-6">
                    {(result.possibleTriggers ?? []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">建议</div>
                  <ul className="list-disc pl-5 text-sm leading-6">
                    {(result.advice ?? []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">可以追问自己</div>
                  <ul className="list-disc pl-5 text-sm leading-6">
                    {(result.questionsToAskUser ?? []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-muted-foreground">
                  {result.disclaimer}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
