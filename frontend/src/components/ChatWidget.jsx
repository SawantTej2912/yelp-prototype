import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { chatWithAssistant, clearAssistantHistory } from '../api/aiAssistant';

function Bubble({ role, children }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[88%] px-4 py-3 rounded-2xl border',
          isUser
            ? 'bg-red-600/15 border-red-500/25 text-white'
            : 'bg-white/05 border-white/10 text-white/80',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }) {
  const reason = String(rec.reason ?? '');
  const isWebRecommendation =
    Number(rec.id) < 0 || reason.toLowerCase().includes('source: web');
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${rec.name} restaurants`)}`;

  const cardClassName =
    'block glass-card p-3 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5';
  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold truncate text-sm">{rec.name}</p>
          <p className="text-[11px] text-white/45 mt-0.5">
            {[rec.cuisine_type, rec.pricing_tier].filter(Boolean).join(' • ') || '—'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-white/45">Rating</p>
          <p className="text-sm font-bold text-yellow-400">
            {typeof rec.avg_rating === 'number' && rec.avg_rating > 0 ? rec.avg_rating.toFixed(1) : '—'}
          </p>
        </div>
      </div>
      {rec.reason && (
        <p className="text-[11px] text-white/55 mt-2 leading-relaxed">
          {rec.reason}
        </p>
      )}
    </>
  );

  if (isWebRecommendation) {
    return (
      <a
        href={googleSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClassName}
      >
        {cardBody}
      </a>
    );
  }

  return (
    <Link
      to={`/restaurants/${rec.id}`}
      className={cardClassName}
    >
      {cardBody}
    </Link>
  );
}

export default function ChatWidget() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      message:
        "Hi! Tell me what you're craving and I’ll recommend restaurants from our app. You can mention cuisine, budget ($–$$$$), and your city.",
      recommendations: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, message: m.message })),
    [messages],
  );

  const isNewConversation = useMemo(() => {
    const hasUserTurn = messages.some((m) => m.role === 'user');
    return !hasUserTurn;
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages, loading]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
    }
  }, [isAuthenticated]);

  const sendMessage = async (text) => {
    const trimmed = (text ?? '').trim();
    if (!trimmed || loading) return;

    setError('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', message: trimmed }]);
    setInput('');

    try {
      const { data } = await chatWithAssistant({
        message: trimmed,
        conversation_history: conversationHistory,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message: data.assistant_message,
          recommendations: data.recommendations ?? [],
        },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message:
            "I’m having trouble right now, but I can still help. Try rephrasing your request (cuisine + city + budget), or tap a quick action.",
          recommendations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleNewConversation = async () => {
    setError('');
    setLoading(true);
    try {
      await clearAssistantHistory();
    } catch {
      // ignore; still reset UI
    } finally {
      setMessages([
        {
          role: 'assistant',
          message: "New conversation started. What are you in the mood for?",
          recommendations: [],
        },
      ]);
      setInput('');
      setLoading(false);
    }
  };

  const quickActions = [
    'Find dinner tonight',
    'Best rated near me',
    'Vegan options',
    'Something romantic',
  ];

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {/* Popup */}
      {open && (
        <div
          className="mb-3 w-[380px] h-[500px] max-w-[calc(100vw-2.5rem)] glass-card border border-white/10 overflow-hidden shadow-2xl shadow-black/40"
          role="dialog"
          aria-label="AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/08 bg-black/20">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">AI Assistant</p>
              <p className="text-[11px] text-white/40 truncate">Restaurant recommendations, conversationally.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleNewConversation}
                disabled={loading}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-white/12 text-white/60 hover:text-white hover:bg-white/06 transition-colors disabled:opacity-50"
                title="New conversation"
              >
                New
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg border border-white/12 text-white/60 hover:text-white hover:bg-white/06 transition-colors flex items-center justify-center"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[372px] overflow-y-auto px-4 py-4 space-y-3">
            {isNewConversation && (
              <div className="flex flex-wrap gap-2 pb-2">
                {quickActions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full border bg-white/04 border-white/10 text-white/60 hover:border-white/25 hover:text-white transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className="space-y-2">
                <Bubble role={m.role}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                </Bubble>

                {Array.isArray(m.recommendations) && m.recommendations.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {m.recommendations.map((rec) => (
                      <RecommendationCard key={rec.id} rec={rec} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl border bg-white/05 border-white/10 text-white/70 flex items-center gap-2">
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/08 p-3 bg-black/20">
            {error && <div className="error-badge mb-2">{error}</div>}
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask… e.g. "cheap ramen in San Jose"'
                className="input-base"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-primary shrink-0"
                style={{ width: 'auto', padding: '0.75rem 1.0rem' }}
              >
                {loading ? <span className="spinner" /> : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 border border-white/10 transition-all active:scale-95 flex items-center justify-center"
        title={open ? 'Close assistant' : 'Open assistant'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m9-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}

