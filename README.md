# DocMind — Learning Content AI

> Upload a PDF. Ask anything. Get answers grounded strictly in the document.

---

## Overview

DocMind is a full-stack AI-powered document Q&A application built with **Next.js**. It lets users upload PDF files, indexes them into a vector database via chunked embeddings, and enables streaming conversational Q&A against the document's contents — all within a dark-themed, production-grade interface.

---

## Features

- **PDF Upload & Indexing** — Uploads are processed server-side, split into chunks, and embedded into a vector store
- **Streaming Chat** — Responses stream token-by-token directly into the UI via the Fetch API's `ReadableStream`
- **Document Library Sidebar** — Browse, switch between, and delete previously uploaded documents
- **Per-Document Chat Context** — Switching documents clears the conversation; answers are always scoped to the active file
- **Clear Conversation** — Reset any chat session without losing the indexed document
- **Auto-scroll** — Chat window automatically scrolls to the latest message

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Inline CSS with CSS Variables |
| Fonts | Syne + JetBrains Mono (Google Fonts) |
| AI / Embeddings | Anthropic / OpenAI API (via `/api/chat`) |
| Vector Store | Configured in `/api/upload` |
| Streaming | Fetch `ReadableStream` + `TextDecoder` |

---

## Project Structure

```
/
├── app/
│   ├── page.tsx              # Main UI (Home component)
│   └── api/
│       ├── upload/
│       │   └── route.ts      # POST — chunk, embed, and store PDF
│       ├── chat/
│       │   └── route.ts      # POST — RAG query with streaming response
│       └── documents/
│           ├── route.ts      # GET — list all documents
│           └── [id]/
│               └── route.ts  # DELETE — remove a document by ID
├── public/
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- An Anthropic or OpenAI API key
- A vector database (e.g. Pinecone, Supabase pgvector, or in-memory)

### Installation

```bash
git clone https://github.com/your-username/docmind.git
cd docmind
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
# AI Provider
OPENAI_API_KEY=your_key_here
# or
ANTHROPIC_API_KEY=your_key_here

# Vector Store (example for Pinecone)
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=your_index_name

# Any other config your /api routes require
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Routes

### `POST /api/upload`

Accepts a `multipart/form-data` request with a `file` field (PDF).

**Response:**
```json
{
  "documentId": "abc123",
  "chunksProcessed": 42
}
```

---

### `GET /api/documents`

Returns all indexed documents.

**Response:**
```json
[
  { "id": "abc123", "filename": "lecture-notes.pdf" },
  { "id": "def456", "filename": "chapter-2.pdf" }
]
```

---

### `DELETE /api/documents/[id]`

Deletes a document and its embeddings by ID.

**Response:** `200 OK` on success.

---

### `POST /api/chat`

Accepts a question and document ID, returns a **streaming text response**.

**Request body:**
```json
{
  "question": "What is the main argument in chapter 3?",
  "documentId": "abc123"
}
```

**Response:** A plain text stream consumed via `ReadableStream`.

---

## Design System

The UI uses a custom dark design system defined entirely with CSS variables:

| Token | Value | Usage |
|---|---|---|
| `--navy-deep` | `#020B18` | Page background |
| `--navy-base` | `#041123` | Card / sidebar surface |
| `--navy-mid` | `#071A35` | Input fields, hover states |
| `--emerald` | `#10B981` | Primary accent, CTAs, indicators |
| `--emerald-glow` | `rgba(16,185,129,0.2)` | Glow effects, focus rings |
| `--text-primary` | `#E8F4F0` | Body text |
| `--text-muted` | `#6B8FA8` | Secondary text |
| `--text-dim` | `#3A6078` | Placeholder, metadata |
| `--danger` | `#F43F5E` | Delete actions |

**Fonts:** `Syne` (UI / headings) + `JetBrains Mono` (metadata, badges, labels)

---

## Usage

1. **Upload a PDF** using the file picker in the left sidebar and click **Upload & Index**
2. Wait for the success message confirming how many chunks were processed
3. **Click the document** in the library to activate it
4. **Type a question** in the input bar and press Enter or click Send
5. The AI responds in a streaming fashion, grounded solely in the document's content
6. Use **Clear** (top-right of chat) to reset the conversation
7. Use the **✕** hover button on any document to delete it from the library

---

## Notes

- Answers are strictly scoped to the uploaded document — the AI will not use outside knowledge
- Switching documents automatically clears the current conversation
- The `documentId` returned on upload is used to scope all vector queries and must be passed with each `/api/chat` request

---

## License

MIT