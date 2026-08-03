"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askCompanyProfileAgent } from "@/lib/asymiq";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "loading";
  content: string;
};

type AsymIQButtonProps = {
  disabled?: boolean;
  initialQuery?: string;
  className?: string;
};

const LOADING_MESSAGE =
  "Looking up company… This can take 5–15 seconds while AsymIQ searches and builds a profile.";

function SparklesIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 3l1.2 4.2L17.5 8.5 13.2 9.7 12 14l-1.2-4.3L6.5 8.5l4.3-1.3L12 3z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M19 14l0.6 2.1 2.1 0.6-2.1 0.6L19 19.4l-0.6-2.1-2.1-0.6 2.1-0.6L19 14z"
        fill="currentColor"
        opacity="0.75"
      />
      <path
        d="M5 16l0.5 1.7 1.7 0.5-1.7 0.5L5 20.2l-0.5-1.7-1.7-0.5 1.7-0.5L5 16z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
    </span>
  );
}

function AssistantMessageContent({ content }: { content: string }) {
  return (
    <div className="asymiq-markdown text-sm leading-relaxed [&_a]:text-indigo-700 [&_a]:underline [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default function AsymIQButton({
  disabled = false,
  initialQuery = "",
  className,
}: AsymIQButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const requestIdRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, messages, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoading]);

  const openChat = () => {
    if (disabled) return;
    const seed = initialQuery.trim();
    setInput(seed);
    setIsLoading(false);
    requestIdRef.current += 1;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi, I'm AsymIQ — your AI search assistant. Ask about a company and I'll look up its profile for you.",
      },
    ]);
    setIsOpen(true);
  };

  const closeChat = () => {
    if (isLoading) return;
    setIsOpen(false);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const loadingId = `loading-${Date.now()}`;

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      },
      {
        id: loadingId,
        role: "loading",
        content: LOADING_MESSAGE,
      },
    ]);

    try {
      const result = await askCompanyProfileAgent(trimmed);
      if (requestIdRef.current !== requestId) return;

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== loadingId),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result,
        },
      ]);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setMessages((prev) => [
        ...prev.filter((item) => item.id !== loadingId),
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        disabled={disabled}
        aria-label="AsymIQ — Get AI to help with your search"
        className={
          className ||
          "group inline-flex items-center gap-2.5 rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 px-3 py-2.5 text-left shadow-sm transition-all hover:border-indigo-300 hover:from-indigo-100 hover:to-violet-100 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        }
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm transition-colors group-hover:bg-indigo-700">
          <SparklesIcon />
        </span>
        <span className="min-w-0 hidden sm:block">
          <span className="block text-sm font-semibold leading-tight text-indigo-950">
            AsymIQ
          </span>
          <span className="block text-[11px] leading-tight text-indigo-700/80">
            Get AI to help with your search
          </span>
        </span>
        <span className="text-sm font-semibold text-indigo-950 sm:hidden">
          AsymIQ
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            role="presentation"
            onClick={closeChat}
            className="fixed inset-0 z-[10000] flex items-end justify-end bg-slate-900/40 p-0 sm:items-end sm:p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="asymiq-title"
              onClick={(event) => event.stopPropagation()}
              className="flex h-[min(640px,100dvh)] w-full flex-col overflow-hidden rounded-t-2xl border border-indigo-100 bg-white shadow-2xl sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[min(420px,calc(100vw-2rem))] sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-white">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15">
                      <SparklesIcon />
                    </span>
                    <div>
                      <h2 id="asymiq-title" className="text-base font-semibold">
                        AsymIQ
                      </h2>
                      <p className="text-xs text-indigo-100">
                        AI search assistant
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close AsymIQ"
                  onClick={closeChat}
                  disabled={isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg leading-none text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        message.role === "user"
                          ? "rounded-br-md bg-indigo-600 text-white"
                          : message.role === "loading"
                            ? "rounded-bl-md border border-indigo-100 bg-indigo-50 text-indigo-900"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.role === "loading" ? (
                        <div className="flex items-start gap-2">
                          <LoadingDots />
                          <span>{message.content}</span>
                        </div>
                      ) : message.role === "assistant" ? (
                        <AssistantMessageContent content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                className="border-t border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    disabled={isLoading}
                    placeholder="Ask about a company..."
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "…" : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
