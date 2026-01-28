import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

export const QuickChat = () => {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    
    // TODO: Интеграция с AI
    alert('AI чат временно отключен. Скоро будет доступен!');
    setMessage('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <Sparkles className="text-white" size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-white" size={20} />
            <h3 className="text-white font-bold">AI Помощник</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 rounded-full p-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-4 h-64 overflow-y-auto bg-gray-50">
        <div className="text-center text-gray-400 text-sm py-8">
          AI помощник временно недоступен
          <br />
          Скоро вернётся!
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Спросите что-нибудь..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled
          />
          <button
            onClick={handleSend}
            disabled
            className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
