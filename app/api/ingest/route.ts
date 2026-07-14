import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestAllMatchups } from "@/lib/stratz";

export const maxDuration = 300;

export async function POST() {
  try {
    if (!process.env.STRATZ_API_KEY) {
      return NextResponse.json({ error: "STRATZ_API_KEY is not set" }, { status: 500 });
    }

    const result = await ingestAllMatchups();

    const payload = JSON.stringify({
      fetched: result.fetched,
      failed: result.failed,
      updatedAt: result.updatedAt,
      matchups: result.matchups,
    });

    await prisma.heroMatchup.upsert({
      where: { id: 1 },
      create: { id: 1, data: payload },
      update: { data: payload },
    });

    return NextResponse.json({
      ok: true,
      fetched: result.fetched,
      failed: result.failed,
      updatedAt: result.updatedAt,
    });
  } catch (err) {
    console.error("Ingest failed:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  const row = await prisma.heroMatchup.findUnique({ where: { id: 1 } });
  if (!row) return NextResponse.json({ data: null });
  return NextResponse.json({ data: row.data, updatedAt: row.updatedAt });
}