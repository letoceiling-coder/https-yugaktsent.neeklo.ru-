import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

const STORAGE_KEY = 'lg_inquiry_threads';

type StoredInquiry = { buyerToken: string; requestId?: number; createdAt: string };

type InquiryThread = {
  id: number;
  subject: string | null;
  messages: Array<{ id: number; body: string; createdAt: string; actor: { fullName: string | null } | null }>;
};

function loadStored(): StoredInquiry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredInquiry[]) : [];
  } catch {
    return [];
  }
}

export default function BuyerInquiryHistory() {
  const [stored] = useState(loadStored);
  const [activeToken, setActiveToken] = useState(stored[0]?.buyerToken ?? '');
  const [reply, setReply] = useState('');

  const threadQuery = useQuery({
    queryKey: ['buyer-inquiry', activeToken],
    queryFn: () => apiGet<InquiryThread>(`/communication/inquiry/${activeToken}`),
    enabled: Boolean(activeToken),
  });

  const messages = useMemo(() => threadQuery.data?.messages ?? [], [threadQuery.data]);

  if (stored.length === 0) return null;

  const sendReply = async () => {
    if (!activeToken || !reply.trim()) return;
    await apiPost(`/communication/inquiry/${activeToken}/messages`, { body: reply.trim() });
    setReply('');
    void threadQuery.refetch();
  };

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <h2 className="font-bold text-lg flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        История обращений
      </h2>
      <div className="flex flex-wrap gap-2">
        {stored.map((s) => (
          <button
            key={s.buyerToken}
            type="button"
            onClick={() => setActiveToken(s.buyerToken)}
            className={`rounded-full px-3 py-1.5 text-xs border min-h-[36px] touch-manipulation ${
              activeToken === s.buyerToken ? 'bg-primary text-primary-foreground border-primary' : ''
            }`}
          >
            {s.requestId ? `Заявка #${s.requestId}` : 'Обращение'}
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg border px-3 py-2 text-sm">
            <p className="text-[11px] text-muted-foreground mb-1">
              {new Date(m.createdAt).toLocaleString('ru-RU')}
              {m.actor ? ` · ${m.actor.fullName ?? 'Менеджер'}` : ' · Вы'}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        {threadQuery.isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}
      </div>
      <div className="flex gap-2 sticky bottom-0 bg-card pt-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Дополнить обращение…"
          className="flex-1 h-11 rounded-lg border px-3 text-base md:text-sm min-w-0"
        />
        <button
          type="button"
          onClick={() => void sendReply()}
          disabled={!reply.trim()}
          className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 touch-manipulation shrink-0"
        >
          Отправить
        </button>
      </div>
    </section>
  );
}
