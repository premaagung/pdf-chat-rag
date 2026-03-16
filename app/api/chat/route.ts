import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

export async function POST(request: NextRequest) {
  try {
    const { question, documentId } = await request.json();

    const embResp = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: question,
      config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: 768 }
    });
    
    const queryVector = embResp.embeddings?.[0]?.values;
    
    // 1. Fetch text AND pageNumber
    if (!queryVector || queryVector.length === 0) {
      return NextResponse.json({ error: "Could not generate search vector" }, { status: 400 });
    }
    
    const vectorString = `[${queryVector.join(",")}]`;

    const similarChunks = await prisma.$queryRaw<{ text: string, pageNumber: number }[]>`
      SELECT text, "pageNumber" FROM "DocumentChunk" 
      WHERE "documentId" = ${documentId}
      ORDER BY embedding <=> ${vectorString}::vector 
      LIMIT 3;
    `;

    // 2. Format the context so the AI knows which text belongs to which page
    const contextText = similarChunks
      .map(c => `(Source Page: ${c.pageNumber}): ${c.text}`)
      .join("\n\n---\n\n");

    // 3. Instruct the AI to cite its sources
    const prompt = `
      Answer the question strictly using the context below. 
      After your answer, mention which pages you used.
      
      Context:
      ${contextText}
      
      Question: ${question}
    `;

    const result = await ai.models.generateContentStream({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            const part = chunk.candidates?.[0]?.content?.parts?.[0];
            if (part && "text" in part && part.text) {
              controller.enqueue(new TextEncoder().encode(part.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}