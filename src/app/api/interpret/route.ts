import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDreamMessages, tryParseDreamResultJson } from "@/lib/prompt";
import { qwenGenerateText } from "@/lib/qwen";
import { rateLimit } from "@/lib/rateLimit";

const MAX_LEN = 5000;
const MIN_LEN = 10;

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "unknown";

    const rl = rateLimit({ key: `interpret:${ip}`, limit: 12, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${rl.retryAfterSec} 秒后再试。` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { dreamText?: unknown; style?: unknown; locale?: unknown }
      | null;

    const dreamText =
      typeof body?.dreamText === "string" ? body.dreamText.trim() : "";
    const style = typeof body?.style === "string" ? body.style.trim() : "";

    if (dreamText.length < MIN_LEN) {
      return NextResponse.json(
        { error: `梦境内容太短（至少 ${MIN_LEN} 个字）。` },
        { status: 400 },
      );
    }
    if (dreamText.length > MAX_LEN) {
      return NextResponse.json(
        { error: `梦境内容过长（最多 ${MAX_LEN} 个字）。` },
        { status: 400 },
      );
    }
    if (!style) {
      return NextResponse.json({ error: "缺少风格参数。" }, { status: 400 });
    }

    const messages = buildDreamMessages({ dreamText, style, locale: "zh-CN" });

    const first = await qwenGenerateText({
      messages,
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1400,
      timeoutMs: 30_000,
    });

    let parsed = tryParseDreamResultJson(first.text);
    if (!parsed) {
      const fix = await qwenGenerateText({
        messages: [
          ...messages,
          {
            role: "assistant",
            content: first.text,
          },
          {
            role: "user",
            content:
              "上一次输出不是严格 JSON 或字段不匹配。请只输出严格 JSON，且必须完全匹配 schema，不能有多余文字。",
          },
        ],
        temperature: 0.2,
        topP: 0.8,
        maxTokens: 1400,
        timeoutMs: 30_000,
      });
      parsed = tryParseDreamResultJson(fix.text);
    }

    if (!parsed) {
      return NextResponse.json(
        { error: "模型返回格式不正确，请重试。" },
        { status: 502 },
      );
    }

    const entry = await prisma.dreamEntry.create({
      data: {
        dreamText,
        style,
        resultJson: parsed,
      },
      select: { id: true },
    });

    return NextResponse.json({ entryId: entry.id, result: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "服务端错误。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

