"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Send, Bot, Sparkles } from "lucide-react";

export default function AIPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-primary" />
        <h1 className="text-xl font-semibold">
          AI Assistant — {owner}/{name}
        </h1>
      </div>

      <div className="flex-1 bg-base-200 border border-base-300 rounded-lg p-4 overflow-auto flex flex-col gap-4">
        <div className="chat chat-start">
          <div className="chat-image avatar">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
          </div>
          <div className="chat-bubble bg-base-300 text-base-content">
            Hello! I'm the yagt AI assistant. Ask me anything about this
            repository.
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask the AI about this repository..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input input-bordered input-sm flex-1 bg-base-100"
        />
        <button className="btn btn-sm btn-primary flex items-center justify-center px-4">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
