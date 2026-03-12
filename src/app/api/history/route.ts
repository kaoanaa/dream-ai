import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

type DreamEntrySubset = Prisma.DreamEntryGetPayload<{
  select: {
    id: true;
    dreamText: true;
    style: true;
    createdAt: true;
  };
}>;

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
      },
    });

    return NextResponse.json({
      items: items.map((x: DreamEntrySubset) => ({
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