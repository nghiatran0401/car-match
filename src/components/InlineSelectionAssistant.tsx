import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookText, Languages, SearchCheck, Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProfile } from '../context/ProfileContext';
import { askQwenAssistant, type AssistantMessage } from '../lib/aiAssistant';
import { vehicles } from '../data/vehicles';
import { localizeVehicle } from '../lib/localizedVehicle';
import { useCompare } from '../context/CompareContext';
import { rankAndSort } from '../lib/recommendationScore';
import { loadMerchantGuardrails } from '../lib/merchantGuardrails';
import { loadAdminConfig } from '../lib/adminConfig';

interface InlineMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

const menuActions = {
  vi: [
    { key: 'fact', label: 'Fact check' },
    { key: 'define', label: 'Định nghĩa' },
    { key: 'summary', label: 'Tóm tắt' },
    { key: 'translate', label: 'Dịch sang tiếng Việt' },
  ],
  en: [
    { key: 'fact', label: 'Fact check' },
    { key: 'define', label: 'Define' },
    { key: 'summary', label: 'Summarize' },
    { key: 'translate', label: 'Translate to English' },
  ],
} as const;

export default function InlineSelectionAssistant() {
  const { language, t } = useLanguage();
  const location = useLocation();
  const { profile, selections } = useProfile();
  const { vehicleIds } = useCompare();

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [selectionText, setSelectionText] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<InlineMessage[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentVehicle = useMemo(() => {
    const hit = location.pathname.match(/^\/vehicle\/([^/]+)$/);
    if (!hit?.[1]) return undefined;
    const found = vehicles.find(v => v.modelSlug === hit[1]);
    return found ? localizeVehicle(found, language) : undefined;
  }, [language, location.pathname]);

  const comparedVehicles = useMemo(
    () =>
      vehicleIds
        .map(id => vehicles.find(v => v.id === id))
        .filter((v): v is NonNullable<typeof v> => Boolean(v))
        .map(v => localizeVehicle(v, language)),
    [vehicleIds, language],
  );

  const shortlistVehicles = useMemo(
    () =>
      rankAndSort(vehicles, profile, selections, language)
        .slice(0, 3)
        .map(entry => localizeVehicle(entry.vehicle, language)),
    [profile, selections, language],
  );

  const clampToViewport = useCallback((x: number, y: number) => {
    const width = 340;
    const height = 430;
    const margin = 12;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  }, []);

  useEffect(() => {
    const onDoubleClick = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const text = selection.toString().trim();
      if (!text) return;
      const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rangeRect.width && !rangeRect.height) return;
      const nextPosition = clampToViewport(rangeRect.left + window.scrollX, rangeRect.bottom + window.scrollY + 10);
      setSelectionText(text);
      setInput(text);
      setMessages([]);
      setError('');
      setPosition(nextPosition);
      setOpen(true);
    };

    document.addEventListener('dblclick', onDoubleClick);
    return () => document.removeEventListener('dblclick', onDoubleClick);
  }, [clampToViewport]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      if (window.getSelection()?.toString().trim()) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const sendPrompt = async (text: string) => {
    if (!text.trim() || loading) return;
    const user: InlineMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    setMessages(prev => [...prev, user]);
    setLoading(true);
    setError('');
    setInput('');

    try {
      const conversation: AssistantMessage[] = [...messages, user].map(item => ({
        role: item.role,
        content: item.content,
      }));
      const reply = await askQwenAssistant(conversation, {
        language,
        profile,
        currentVehicle,
        comparedVehicles,
        shortlistVehicles,
        merchantGuardrails: loadMerchantGuardrails(),
        adminPromptInstructions: loadAdminConfig().promptInstructions,
      });
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t({ vi: 'Yêu cầu thất bại.', en: 'Request failed.' }));
    } finally {
      setLoading(false);
    }
  };

  const runAction = (actionKey: string) => {
    const prompt =
      actionKey === 'fact'
        ? language === 'vi'
          ? `Hãy fact-check đoạn này và nêu điểm đúng/sai ngắn gọn: "${selectionText}"`
          : `Fact-check this text and highlight what is correct or questionable: "${selectionText}"`
        : actionKey === 'define'
          ? language === 'vi'
            ? `Giải thích ngắn gọn ý nghĩa của đoạn sau theo ngữ cảnh mua xe: "${selectionText}"`
            : `Define this in a car-buying context with concise language: "${selectionText}"`
          : actionKey === 'summary'
            ? language === 'vi'
              ? `Tóm tắt đoạn sau thành 2-3 ý chính: "${selectionText}"`
              : `Summarize this into 2-3 key points: "${selectionText}"`
            : language === 'vi'
              ? `Dịch đoạn sau sang tiếng Việt tự nhiên: "${selectionText}"`
              : `Translate this to natural English: "${selectionText}"`;
    void sendPrompt(prompt);
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[95] w-[min(92vw,340px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t({ vi: 'Hỏi nhanh về đoạn bôi đen...', en: 'Ask anything about this text...' })}
          className="input-base mt-0 min-h-[40px]"
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
          aria-label={t({ vi: 'Đóng', en: 'Close' })}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {selectionText ? (
        <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500 line-clamp-2">“{selectionText}”</p>
      ) : null}

      <div className="mt-3 space-y-1.5">
        {menuActions[language].map(action => (
          <button
            key={action.key}
            type="button"
            onClick={() => runAction(action.key)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
          >
            {action.key === 'fact' ? <SearchCheck className="h-4 w-4 text-slate-500" /> : null}
            {action.key === 'define' ? <Sparkles className="h-4 w-4 text-slate-500" /> : null}
            {action.key === 'summary' ? <BookText className="h-4 w-4 text-slate-500" /> : null}
            {action.key === 'translate' ? <Languages className="h-4 w-4 text-slate-500" /> : null}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          void sendPrompt(input || selectionText);
        }}
        className="mt-3"
      >
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:bg-slate-300">
          {loading ? t({ vi: 'Đang xử lý...', en: 'Working...' }) : t({ vi: 'Hỏi AI ngay', en: 'Ask AI now' })}
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-amber-700">{error}</p> : null}
      {messages.length > 0 ? (
        <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          {messages.map(message => (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'ml-8 rounded-xl bg-slate-900 px-2.5 py-1.5 text-xs text-white'
                  : 'mr-8 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700'
              }
            >
              {message.content}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
