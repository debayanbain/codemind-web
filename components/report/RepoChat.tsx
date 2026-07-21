'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  SendHorizontal,
  Loader2,
  MessageSquareText,
} from 'lucide-react';
import { ApiError, chatWithRepo, type ChatMessage } from '../../lib/api';
import type { AgentResultSummary, Synthesis } from '../../lib/types';
import { reportSuggestions } from '../../lib/report-suggestions';

// ~5 lines of the 12.5px composer text before it starts scrolling.
const MAX_INPUT_HEIGHT = 120;

/**
 * Ask-the-repo chat. Answers are grounded server-side on the code graph (cheap,
 * targeted retrieval) plus the persisted report — see api-gateway ChatService.
 * History is client-only: the whole transcript rides along on each request, so
 * there's nothing to persist and the panel resets when you leave the page.
 *
 * Suggestions are derived from THIS report's findings (see reportSuggestions),
 * so they only ever point at things the analysis actually covered.
 */
export function RepoChat({
  jobId,
  agentResults,
  synthesis,
}: {
  jobId: string;
  agentResults: AgentResultSummary[];
  synthesis: Synthesis | null;
}) {
  const suggestions = useMemo(
    () => reportSuggestions(agentResults, synthesis),
    [agentResults, synthesis],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Index of the assistant message currently being typed out, or null.
  const [typingIndex, setTypingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  // Auto-grow the composer with its content up to ~5 lines, then let it scroll.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [input]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setError(null);
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const { answer } = await chatWithRepo(jobId, next);
      // The assistant lands at index next.length — mark it for the typewriter.
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      setTypingIndex(next.length);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'The report needs to finish before you can ask about it.'
          : 'Something went wrong. Please try again.',
      );
      // Roll the failed question back out so the input restores it for a retry.
      setMessages((prev) => prev.slice(0, -1));
      setInput(question);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/50 backdrop-blur-md shadow-lg">
      {/* Header */}
      <div className="flex flex-none items-center gap-3 border-b border-line px-4 py-3.5 bg-surface-2/30">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-glow-blue/15 text-glow-blue border border-glow-blue/20">
          <Sparkles size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold font-poppins leading-tight text-fg">
            Ask this repo
          </h3>
          <p className="m-0 truncate text-xs font-poppins text-muted mt-0.5">
            Grounded in code graph & report
          </p>
        </div>
      </div>

      {/* Messages — overflow-x-hidden so a long code path in an answer can't
          push the panel sideways; long tokens wrap / code blocks scroll inside. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 scroll-smooth"
        aria-live="polite"
      >
        {empty ? (
          <div className="flex flex-col gap-3.5 pt-1">
            <div className="flex items-center gap-2 text-muted/90 font-poppins">
              <MessageSquareText size={15} aria-hidden="true" className="text-glow-blue" />
              <span className="text-xs font-medium">Ask anything about this codebase.</span>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-poppins text-[11px] font-semibold uppercase tracking-wider text-muted/70">
                  Based on this report
                </span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={loading}
                    className="group rounded-xl border border-line/80 bg-surface-2/60 px-3.5 py-2.5 text-left text-xs font-poppins text-fg/90 transition-all hover:border-glow-blue/50 hover:bg-surface-2 hover:text-fg disabled:opacity-50 flex items-center justify-between gap-2"
                  >
                    <span>{s}</span>
                    <Sparkles size={13} className="text-glow-blue opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatBubble
              key={i}
              message={m}
              animate={i === typingIndex}
              onTick={scrollToBottom}
              onDone={() => setTypingIndex((cur) => (cur === i ? null : cur))}
            />
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-muted font-poppins">
            <Loader2 size={15} className="animate-spin text-glow-blue" aria-hidden="true" />
            <span className="font-mono text-xs text-muted">Reading code context…</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p
          className="mx-4 mb-1 font-poppins text-xs text-red-300/90 bg-red-950/20 border border-red-500/20 rounded-lg p-2"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Composer */}
      <form
        className="flex flex-none items-end gap-2 border-t border-line bg-surface-2/20 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter for a newline.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask about this repo…"
          aria-label="Ask a question about this repository"
          className="min-h-[42px] max-h-[120px] w-full min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-line bg-surface-2/90 px-3.5 py-[11px] text-[12.5px] leading-normal text-fg outline-none [font-family:var(--font-sans)] placeholder:text-muted/70 focus:border-glow-blue focus:ring-1 focus:ring-glow-blue/40 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ''}
          aria-label="Send"
          className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-glow-blue text-white shadow-md transition-all hover:bg-glow-blue/90 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <SendHorizontal size={17} />
          )}
        </button>
      </form>
    </div>
  );
}

function ChatBubble({
  message,
  animate = false,
  onTick,
  onDone,
}: {
  message: ChatMessage;
  animate?: boolean;
  onTick?: () => void;
  onDone?: () => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex min-w-0 justify-end' : 'flex min-w-0 justify-start'}>
      <div
        className={
          isUser
            ? 'min-w-0 max-w-[88%] rounded-2xl rounded-br-xs bg-glow-blue/20 border border-glow-blue/30 px-3.5 py-2 shadow-xs'
            : 'chat-answer min-w-0 max-w-[94%] rounded-2xl rounded-bl-xs border border-line bg-surface-2/70 px-3.5 py-2 shadow-xs'
        }
      >
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[12.5px] leading-relaxed text-fg [font-family:var(--font-sans)]">
            {message.content}
          </p>
        ) : animate ? (
          <TypewriterMarkdown
            text={message.content}
            onTick={onTick}
            onDone={onDone}
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

/**
 * Reveals a markdown answer progressively, like a typing chatbot. Reveals the
 * whole answer over a fixed duration regardless of length (so long answers
 * don't drag), re-parsing the partial markdown each tick. Honors reduced-motion
 * by showing the full text immediately.
 */
function TypewriterMarkdown({
  text,
  onTick,
  onDone,
}: {
  text: string;
  onTick?: () => void;
  onDone?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(() => (reduceMotion ? text.length : 0));

  useEffect(() => {
    if (reduceMotion || count >= text.length) {
      onDone?.();
      return;
    }
    const TOTAL_MS = 1600; // full reveal window
    const FRAME_MS = 22;
    const step = Math.max(1, Math.ceil(text.length / (TOTAL_MS / FRAME_MS)));
    const id = setTimeout(() => {
      setCount((n) => Math.min(text.length, n + step));
      onTick?.();
    }, FRAME_MS);
    return () => clearTimeout(id);
  }, [count, text, reduceMotion, onTick, onDone]);

  const typing = count < text.length;
  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text.slice(0, count)}
      </ReactMarkdown>
      {typing && <span className="chat-caret" aria-hidden="true" />}
    </>
  );
}
