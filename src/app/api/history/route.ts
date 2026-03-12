import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// 不需要再导入 DreamEntry，因为我们要让 TS 自动推断

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const limit = Math.min(
      50,
      Math.max(1, limitRaw ? Number.parseInt(limitRaw, 10) : 20),
    );

    const items = await prisma.dreamEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: Number.isFinite(limit) ? limit : 20,
      select: {
        id: true,
        dreamText: true,
        style: true,
        createdAt: true,
        // 如果数据库里有 resultJson 且你需要它，请在这里加上 resultJson: true
        // 如果不需要，保持现状即可
      },
    });

    return NextResponse.json({
      // 修复点：移除 (x: DreamEntry)，让 TS 自动推断 x 的类型为 select 返回的子集
      items: items.map((x) => ({
        id: x.id,
        dreamText: x.dreamText,
        style: x.style,
        createdAt: x.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "服务端错误。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}