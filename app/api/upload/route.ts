import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

function chunkText(text: string, chunkSize = 1000, chunkOverlap = 200) {
  const chunks: string[] = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    chunks.push(text.slice(startIndex, startIndex + chunkSize));
    startIndex += chunkSize - chunkOverlap;
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    // 1. Extract text - unpdf returns { text: string[], totalPages: number }
    const { text: pageTexts } = await extractText(new Uint8Array(arrayBuffer));

    const document = await prisma.document.create({ data: { filename: file.name } });

    // 2. Process each page - pageTexts is an array of strings
    const chunksWithMetadata: { text: string; page: number }[] = [];
    
    // Explicitly typing 'pageText' as string and 'index' as number to fix 'any' errors
    pageTexts.forEach((pageText: string, index: number) => {
      // Clean the text for each page
      const cleanPageText = pageText.replace(/\n/g, " ").replace(/\s+/g, " ");
      const pageChunks = chunkText(cleanPageText);
      
      pageChunks.forEach(chunk => {
        chunksWithMetadata.push({ text: chunk, page: index + 1 });
      });
    });

    // 3. Generate Embeddings for all chunks
    const embeddingPromises = chunksWithMetadata.map((item) => 
      ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: item.text,
        config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 }
      })
    );

    const results = await Promise.all(embeddingPromises);

    // 4. Save to Database including the 'pageNumber'
    await prisma.$transaction(
      results.map((res: any, index: number) => {
        const values = res.embeddings?.[0]?.values || res.embedding?.values;
        return prisma.$executeRaw`
          INSERT INTO "DocumentChunk" (id, text, embedding, "documentId", "pageNumber")
          VALUES (
            gen_random_uuid()::text, 
            ${chunksWithMetadata[index].text}, 
            ${`[${values.join(",")}]`}::vector, 
            ${document.id},
            ${chunksWithMetadata[index].page}
          )
        `;
      })
    );

    return NextResponse.json({ 
      success: true, 
      chunksProcessed: chunksWithMetadata.length, 
      documentId: document.id 
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}