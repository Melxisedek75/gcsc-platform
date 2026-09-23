import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import {
  api,
  type GcscChatMessage,
  type GcscChatThread,
  type GcscUser,
} from '../../services/api';

type PendingMessage = { threadId: number; text: string; clientMessageId: string };

function mergeMessages(current: GcscChatMessage[], incoming: GcscChatMessage[]) {
  const bySequence = new Map(current.map((message) => [message.sequence, message]));
  for (const message of incoming) bySequence.set(message.sequence, message);
  return [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
}

export function ChatPanel({
  user,
  initialBidId,
  onBidConsumed,
}: {
  user: GcscUser;
  initialBidId: number | null;
  onBidConsumed: () => void;
}) {
  const [threads, setThreads] = useState<GcscChatThread[]>([]);
  const [hasMoreThreads, setHasMoreThreads] = useState(false);
  const [selected, setSelected] = useState<GcscChatThread | null>(null);
  const [messages, setMessages] = useState<GcscChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const threadsCursorRef = useRef<number | null>(null);

  const loadThreads = useCallback(async (append = false) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const response = await api.getChatThreads(append ? threadsCursorRef.current ?? undefined : undefined, 50);
      if (version !== requestVersion.current) return;
      setThreads((current) => append
        ? [...new Map([...current, ...response.threads].map((thread) => [thread.id, thread])).values()]
        : response.threads);
      threadsCursorRef.current = response.next_before;
      setHasMoreThreads(response.has_more);
      if (!append) setSelected((current) => current && response.threads.find((thread) => thread.id === current.id) || response.threads[0] || null);
    } catch (err) {
      if (version === requestVersion.current) setError(err instanceof Error ? err.message : 'Could not load conversations');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setThreads([]);
    threadsCursorRef.current = null;
    setHasMoreThreads(false);
    setSelected(null);
    setMessages([]);
    setPending(null);
    setDraft('');
    void loadThreads(false);
    return () => { requestVersion.current += 1; };
  }, [user.id, loadThreads]);

  useEffect(() => {
    if (!initialBidId) return;
    let active = true;
    setError('');
    void api.openChatThread(initialBidId).then(({ thread }) => {
      if (!active) return;
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
      setSelected(thread);
      onBidConsumed();
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'Could not open conversation');
    });
    return () => { active = false; };
  }, [initialBidId, onBidConsumed]);

  const loadMessages = useCallback(async (thread: GcscChatThread, incremental = false) => {
    const after = incremental ? messages.at(-1)?.sequence || 0 : 0;
    try {
      const response = await api.getChatMessages(thread.id, after, 100);
      if (selected?.id !== thread.id && incremental) return;
      setSelected(response.thread);
      setMessages((current) => incremental ? mergeMessages(current, response.messages) : response.messages);
      setHasMoreMessages(response.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages');
    }
  }, [messages, selected?.id]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    setMessages([]);
    setHasMoreMessages(false);
    setPending((current) => current?.threadId === selected.id ? current : null);
    void loadMessages(selected);
  // The selected id defines the conversation reset; polling performs incremental reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setInterval(() => void loadMessages(selected, true), 5000);
    return () => window.clearInterval(timer);
  }, [selected, loadMessages]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!selected || sending) return;
    const text = pending?.threadId === selected.id ? pending.text : draft.trim();
    if (!text) return;
    const message = pending?.threadId === selected.id
      ? pending
      : { threadId: selected.id, text, clientMessageId: crypto.randomUUID() };
    setPending(message);
    setSending(true);
    setError('');
    try {
      const response = await api.sendChatMessage(selected.id, {
        text: message.text,
        client_message_id: message.clientMessageId,
      });
      setMessages((current) => mergeMessages(current, [response.message]));
      setDraft('');
      setPending(null);
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Delivery is uncertain'}. Retry keeps the same message key.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A]">Project chat</h2>
        <p className="font-inter text-sm text-[#475569] mt-1">Private conversations opened from a real project bid.</p>
      </div>
      {error && <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm text-[#B91C1C]">{error}</div>}
      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-[#E2E8F0] bg-[#F8FAFC] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4">
            <span className="font-semibold text-[#0F172A]">Conversations</span>
            <button type="button" onClick={() => void loadThreads(false)} aria-label="Refresh conversations" className="p-2 text-[#64748B] hover:text-[#7B2FF7]">
              <RefreshCw size={16} />
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-[#64748B]"><Loader2 size={18} className="mr-2 inline animate-spin" />Loading...</div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]"><MessageCircle size={28} className="mx-auto mb-3 text-[#94A3B8]" />Open chat from a project bid.</div>
          ) : threads.map((thread) => (
            <button key={thread.id} type="button" onClick={() => setSelected(thread)} className={`w-full border-b border-[#E2E8F0] p-4 text-left ${selected?.id === thread.id ? 'bg-white' : 'hover:bg-white/70'}`}>
              <p className="truncate font-semibold text-[#0F172A]">{thread.counterparty.full_name}</p>
              <p className="mt-1 truncate text-xs text-[#64748B]">{thread.title}</p>
            </button>
          ))}
          {hasMoreThreads && (
            <button type="button" onClick={() => void loadThreads(true)} disabled={loading} className="w-full px-4 py-3 text-sm font-semibold text-[#7B2FF7] disabled:opacity-50">
              Load more conversations
            </button>
          )}
        </aside>
        <section className="flex min-h-[420px] flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-[#64748B]">Select a conversation or open one from a bid.</div>
          ) : (
            <>
              <header className="border-b border-[#E2E8F0] p-4">
                <p className="font-semibold text-[#0F172A]">{selected.counterparty.full_name}</p>
                <p className="text-xs text-[#64748B]">{selected.title} {!selected.can_send && '- Read only'}</p>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {hasMoreMessages && (
                  <button type="button" onClick={() => void loadMessages(selected, true)} className="mx-auto block rounded-md border border-[#C4B5FD] px-3 py-1.5 text-xs font-semibold text-[#7B2FF7]">
                    Load more messages
                  </button>
                )}
                {messages.length === 0 && <p className="py-12 text-center text-sm text-[#94A3B8]">No messages yet.</p>}
                {messages.map((message) => {
                  const mine = message.sender_id === user.id;
                  return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${mine ? 'bg-[#7B2FF7] text-white' : 'bg-[#F1F5F9] text-[#0F172A]'}`}>{message.text}</div></div>;
                })}
                {pending && pending.threadId === selected.id && <p className="text-right text-xs text-[#B45309]">Message not acknowledged. Retry uses the same delivery key.</p>}
              </div>
              <form onSubmit={send} className="border-t border-[#E2E8F0] p-4">
                <div className="flex gap-2">
                  <textarea value={pending?.threadId === selected.id ? pending.text : draft} onChange={(event) => !pending && setDraft(event.target.value)} disabled={!selected.can_send || !!pending} maxLength={4000} rows={2} placeholder={selected.can_send ? 'Write a message' : 'This conversation is read only'} className="min-h-[48px] flex-1 resize-none rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#7B2FF7] focus:outline-none disabled:bg-[#F8FAFC]" />
                  <button type="submit" disabled={!selected.can_send || sending || (!draft.trim() && !pending)} aria-label={pending ? 'Retry message' : 'Send message'} className="self-end rounded-lg bg-[#7B2FF7] p-3 text-white disabled:opacity-50">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : pending ? <RefreshCw size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
