import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { parseEntryFromText } from '../services/ai';

interface AIChatProps {
  onEntryParsed: (entry: any) => void; // Changed to any since this component is deprecated
  onClose: () => void;
}

// DEPRECATED: This component is no longer used. Use QuickChat instead.
export const AIChat = ({ onEntryParsed, onClose }: AIChatProps) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const parsed = await parseEntryFromText(input);
      onEntryParsed(parsed);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обработки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-black">AI Ассистент</h3>
              <p className="text-sm text-gray-500">Опишите состояние кота</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="bg-[#F5F5F7] rounded-2xl p-4">
              <p className="text-sm text-gray-700">
                Напишите в свободной форме о состоянии кота, например:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• "Сегодня состояние хорошее, дал преднизолон 0,3"</li>
                <li>• "Плохо, была рвота, не ест"</li>
                <li>• "Отлично себя чувствует, активный"</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-gray-100">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Опишите состояние кота..."
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-2xl focus:bg-white focus:border-gray-300 transition-all text-black placeholder-gray-400 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Обработка...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Отправить</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
