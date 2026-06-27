import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { recordChatUsed } from "../utils/engagement";
import { getSessionId } from "../utils/track";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm Junjie's AI concierge. Ask me anything about his work, projects, or experience.",
};

const SUGGESTIONS = [
  "What's your C++ experience?",
  "What are you working on now?",
];

const FALLBACK_REPLY = "Sorry, I'm having trouble right now. Try again in a moment.";

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
    <path
      d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 8.2l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
    <path
      d="M6 6l12 12M18 6L6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
    <path
      d="M4 12l16-7-7 16-2.5-6.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Focus the input when the panel opens; when it closes, restore focus to the
  // FAB so keyboard users aren't dropped back to <body>.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      requestAnimationFrame(() => fabRef.current?.focus());
    }
    wasOpen.current = open;
  }, [open]);

  // Escape closes the panel. Capture phase + stopPropagation so the app's
  // global Escape handler doesn't ALSO fire (which would navigate away from a
  // project or close the section sitting behind the chat).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [open]);

  // Keep the message list pinned to the latest message.
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, busy]);

  // Mobile keyboard handling. When the on-screen keyboard opens, the browser
  // would otherwise scroll the whole page up to reveal the focused input (which
  // sits behind the keyboard). Instead, track the VisualViewport and lift the
  // fixed panel above the keyboard so the input stays visible and the page
  // never scrolls.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!vv || !panel) return;

    const apply = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (overlap > 80) {
        // Keyboard is up: pin the panel above it and fit the visible area.
        panel.style.bottom = `${overlap}px`;
        panel.style.height = `${vv.height}px`;
        panel.style.maxHeight = `${vv.height}px`;
      } else {
        // Keyboard down: revert to the CSS-driven sheet sizing.
        panel.style.bottom = "";
        panel.style.height = "";
        panel.style.maxHeight = "";
      }
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      panel.style.bottom = "";
      panel.style.height = "";
      panel.style.maxHeight = "";
    };
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    recordChatUsed();

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-10), sessionId: getSessionId() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const error = typeof data?.error === "string" ? data.error : FALLBACK_REPLY;
        setMessages((prev) => [...prev, { role: "assistant", content: error }]);
      } else if (response.ok && typeof data?.reply === "string") {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: FALLBACK_REPLY }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: FALLBACK_REPLY }]);
    } finally {
      setBusy(false);
      // Re-focus the input so the user can keep typing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  };

  // Focus trap: keep Tab focus inside the dialog to honor aria-modal.
  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {!open && (
        <button
          ref={fabRef}
          type="button"
          className="chat-fab"
          aria-label="Open chat — ask me anything about Junjie"
          onClick={() => setOpen(true)}
        >
          <ChatIcon />
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="chat-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Ask me about Junjie"
          onKeyDown={onPanelKeyDown}
        >
          <div className="chat-panel__header">
            <h3>Ask me about Junjie</h3>
            <button
              type="button"
              className="chat-panel__close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="chat-messages" ref={listRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-msg ${message.role === "user" ? "chat-msg--user" : "chat-msg--bot"}`}
              >
                {message.content}
              </div>
            ))}

            {messages.length === 1 && !busy && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chat-suggestion"
                    onClick={() => void sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <div className="chat-typing" aria-live="polite" aria-label="Typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              value={draft}
              placeholder="Type your message…"
              aria-label="Type your message"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <button
              type="submit"
              className="chat-send"
              aria-label="Send message"
              disabled={busy || !draft.trim()}
            >
              <SendIcon />
            </button>
          </form>

          <p className="chat-disclaimer">
            This is an AI assistant and may make mistakes. For anything important,
            contact Junjie at{" "}
            <a href="mailto:jaywu0046@gmail.com">jaywu0046@gmail.com</a>.
          </p>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
