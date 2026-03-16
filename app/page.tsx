"use client";

import { useState } from "react";

export default function Home() {
  // --- State ---
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [asking, setAsking] = useState(false);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadMessage("Processing document and generating embeddings...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadMessage(`Success! Processed ${data.chunksProcessed} chunks.`);
        setCurrentDocId(data.documentId); // Save ID for document-specific chat
      } else {
        setUploadMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadMessage("Upload failed. Check the console.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    // Ensure we have a question and a document context
    if (!question.trim() || !currentDocId) return;

    const userMsg = { role: "user" as const, text: question };
    // Add user message and an empty AI bubble to start streaming into
    setChatHistory((prev) => [...prev, userMsg, { role: "ai", text: "" }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: userMsg.text,
          documentId: currentDocId 
        }),
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value, { stream: true }); // Tambahkan { stream: true }

      setChatHistory((prev) => {
        const newHistory = [...prev];
        const lastIndex = newHistory.length - 1;
        // Update teks pada bubble terakhir (punya AI)
        newHistory[lastIndex] = {
          ...newHistory[lastIndex],
          text: newHistory[lastIndex].text + chunkValue,
        };
        return newHistory;
      });
    }
    } catch (error) {
      console.error("Streaming error:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I encountered an error connecting to the brain." }
      ]);
    } finally {
      setAsking(false);
    }
  };

  // --- UI Render ---
  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-900">Learning Content AI Prototype</h1>
          <p className="text-gray-600 mt-2">Upload a document and ask questions based strictly on its contents.</p>
        </div>

        {/* 1. Knowledge Base Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">1. Knowledge Base Upload</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
            >
              {uploading ? "Uploading..." : "Upload & Process"}
            </button>
          </div>
          {uploadMessage && (
            <p className="mt-3 text-sm font-medium text-green-600">{uploadMessage}</p>
          )}
        </div>

        {/* 2. Chat Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-125">
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <h2 className="text-xl font-semibold">2. Ask the Document</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatHistory.length === 0 ? (
              <p className="text-gray-400 text-center mt-20">
                {currentDocId ? "Ask a question about the document!" : "Upload a PDF above to begin."}
              </p>
            ) : (
              chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            {asking && chatHistory[chatHistory.length-1]?.text === "" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 p-4 rounded-xl rounded-tl-none animate-pulse">
                  AI is searching...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-4">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                disabled={!currentDocId}
                placeholder={currentDocId ? "Ask something..." : "Upload a PDF first"}
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <button
                onClick={handleAsk}
                disabled={asking || !question.trim() || !currentDocId}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}