"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  closeAsymIQSession,
  sendAsymIQMessage,
  type AsymIQChoice,
} from "@/lib/asymiq";
import AsymIQMessageBody, {
  type AsymIQAssistantPayload,
} from "@/components/asymiq/AsymIQMessageBody";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "loading";
  content: string;
  payload?: AsymIQAssistantPayload;
};

type AsymIQButtonProps = {
  disabled?: boolean;
  initialQuery?: string;
  className?: string;
};

const LOADING_MESSAGE = "Searching the Asymmetrix database…";

const WELCOME_PAYLOAD: AsymIQAssistantPayload = {
  content:
    "I'm AsymIQ. I answer from the Asymmetrix database — company profiles, investors, advisors, deals and our Insights & Analysis. Ask a question, or ask for a list and I'll open it pre-filtered.",
  suggestions: [
    "10 biggest German companies by revenue",
    "Tell me about Snowflake",
    "Latest articles about GlobalData",
  ],
};

function SparklesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 3l1.2 4.2L17.5 8.5 13.2 9.7 12 14l-1.2-4.3L6.5 8.5l4.3-1.3L12 3z"
        fill="currentColor"
      />
      <path
        d="M19 14l0.6 2.1 2.1 0.6-2.1 0.6L19 19.4l-0.6-2.1-2.1-0.6 2.1-0.6L19 14z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M5 16l0.5 1.7 1.7 0.5-1.7 0.5L5 20.2l-0.5-1.7-1.7-0.5 1.7-0.5L5 16z"
        fill="currentColor"
        opacity="0.8"
      />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ax-cyan-500)]"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function newConversationMessages(): ChatMessage[] {
  return [
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_PAYLOAD.content,
      payload: WELCOME_PAYLOAD,
    },
  ];
}

const iconBtn =
  "inline-flex h-7 items-center justify-center rounded-md border border-[var(--border-1)] bg-white px-2 text-[12px] font-semibold text-[var(--fg-2)] transition-colors hover:bg-[var(--bg-3)] disabled:cursor-not-allowed disabled:opacity-50";

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
  // Session memory lives server-side; we only keep the session id for the open conversation.
  const sessionUidRef = useRef<string | null>(null);

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
      if (event.key === "Escape" && !isLoading) closeChat();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoading]);

  const openChat = () => {
    if (disabled) return;
    setInput(initialQuery.trim());
    setIsLoading(false);
    requestIdRef.current += 1;
    sessionUidRef.current = null;
    setMessages(newConversationMessages());
    setIsOpen(true);
  };

  const endSession = () => {
    const uid = sessionUidRef.current;
    sessionUidRef.current = null;
    if (uid) void closeAsymIQSession(uid);
  };

  const closeChat = () => {
    if (isLoading) return;
    endSession(); // closing the chat resets memory
    setIsOpen(false);
  };

  const newConversation = () => {
    if (isLoading) return;
    endSession();
    requestIdRef.current += 1;
    setInput("");
    setMessages(newConversationMessages());
  };

  const sendMessage = async (override?: string) => {
    const trimmed = (override ?? input).trim();
    if (!trimmed || isLoading) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const loadingId = `loading-${Date.now()}`;

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: trimmed },
      { id: loadingId, role: "loading", content: LOADING_MESSAGE },
    ]);

    try {
      const result = await sendAsymIQMessage(trimmed, sessionUidRef.current);
      if (requestIdRef.current !== requestId) return;
      if (result.session_uid) sessionUidRef.current = result.session_uid;

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingId),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          payload: {
            content: result.reply,
            entities: result.entities,
            choices: result.choices,
            listLinks: result.list_links,
            suggestions: result.suggestions,
            cards: result.cards,
            actions: result.actions,
          },
        },
      ]);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingId),
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: message,
          payload: { content: message },
        },
      ]);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  };

  const handleChoose = (choice: AsymIQChoice) => void sendMessage(choice.name);
  const handleSuggest = (text: string) => void sendMessage(text);

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
        aria-label="Open AsymIQ research assistant"
        className={
          className ||
          "inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ax-cyan-600)] pl-3.5 pr-4 text-[13px] font-semibold text-white shadow-[var(--shadow-brand-glow)] transition-colors hover:bg-[var(--ax-cyan-700)] focus:outline-none focus:ring-2 focus:ring-[var(--ax-cyan-400)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <SparklesIcon size={16} />
        AsymIQ
      </button>

      {isOpen &&
        createPortal(
          <div
            role="presentation"
            className="pointer-events-none fixed inset-0 z-[10000] flex items-end justify-end p-0 sm:p-4"
          >
            <div
              role="dialog"
              aria-modal="false"
              aria-labelledby="asymiq-title"
              className="pointer-events-auto flex h-[min(680px,100dvh)] w-full flex-col overflow-hidden rounded-t-xl border border-[var(--border-1)] bg-white shadow-[var(--shadow-md)] sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[min(440px,calc(100vw-2rem))] sm:rounded-xl"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <div className="flex items-center gap-2.5 border-b border-[var(--border-1)] bg-white px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ax-cyan-600)] text-white">
                  <SparklesIcon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="asymiq-title"
                    className="m-0 text-[14px] font-bold leading-tight text-[var(--fg-1)]"
                  >
                    AsymIQ
                  </h2>
                  <p className="m-0 text-[11.5px] leading-tight text-[var(--fg-3)]">
                    Research assistant · Asymmetrix database
                  </p>
                </div>
                <button
                  type="button"
                  onClick={newConversation}
                  disabled={isLoading}
                  className={iconBtn}
                >
                  New chat
                </button>
                <button
                  type="button"
                  aria-label="Close AsymIQ"
                  onClick={closeChat}
                  disabled={isLoading}
                  className={`${iconBtn} w-7 px-0 text-[16px] leading-none`}
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--bg-2)] px-4 py-4">
                {messages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[var(--ax-cyan-600)] px-3 py-2 text-[13px] leading-[1.5] text-white shadow-[var(--shadow-xs)]">
                          {message.content}
                        </div>
                      </div>
                    );
                  }
                  if (message.role === "loading") {
                    return (
                      <div key={message.id} className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-[var(--border-1)] bg-white px-3 py-2 text-[12.5px] text-[var(--fg-3)]">
                          <LoadingDots />
                          <span>{message.content}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={message.id} className="flex justify-start">
                      <div className="w-full max-w-[94%] rounded-xl rounded-bl-sm border border-[var(--border-1)] bg-white px-3.5 py-3 shadow-[var(--shadow-xs)]">
                        <AsymIQMessageBody
                          payload={message.payload ?? { content: message.content }}
                          onChoose={handleChoose}
                          onSuggest={handleSuggest}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                className="border-t border-[var(--border-1)] bg-white px-4 pb-2.5 pt-3"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    disabled={isLoading}
                    placeholder="Ask about a company, or for a list…"
                    className="min-h-[44px] flex-1 resize-none rounded-lg border border-[var(--border-1)] bg-[var(--bg-2)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:border-[var(--border-brand)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ax-cyan-100)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--ax-cyan-600)] text-white shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--ax-cyan-700)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="m-0 mt-1.5 text-[10.5px] text-[var(--fg-4)]">
                  Answers come from the Asymmetrix database · Shift+Enter for a new line
                </p>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
