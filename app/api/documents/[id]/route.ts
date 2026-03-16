import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// 1. Update the type definition to Promise<{ id: string }>
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // 2. Await the params before grabbing the ID
    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // 1. Delete all associated chunks first
    await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "documentId" = ${documentId}`;

    // 2. Delete the parent document record
    try {
    await prisma.document.delete({
        where: { id: documentId },
    });
    } catch (e: any) {
    // Ignore the error if the record is already gone (Code P2025)
    if (e.code !== 'P2025') throw e; 
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}