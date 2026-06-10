import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Hourglass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

let chatMsgCounter = 0;
const generateId = (prefix: string) => {
  chatMsgCounter += 1;
  return `${prefix}-${chatMsgCounter}`;
};

export const LanChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Olá! Sou a **Lan**, sua assistente inteligente. Vestindo a camisa da nossa Seleção! 🇧🇷⚽ Como posso ajudar você a operar o sistema e gerenciar o hotel hoje? 🏆✨'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    'Como fazer check-in?',
    'Limpeza atrasada?',
    'Como lançar consumos?',
    'Como exportar financeiro?'
  ];

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = generateId('user');
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor');
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          id: generateId('lan'),
          role: 'assistant',
          text: data.text || 'Desculpe, não consegui processar sua solicitação.'
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: generateId('err'),
          role: 'assistant',
          text: 'Ops! Ocorreu um erro ao me conectar com o servidor. Por favor, verifique se a chave de API do Gemini em **Configurações > Segredos** está corretamente preenchida.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (text: string) => {
    // Basic bold markdown formatter: **text** -> <strong>text</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-brand-gold font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-[360px] md:w-[400px] h-[550px] bg-[#121214] border border-white/5 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-bg to-[#1a1a1f] p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold">
                    <Bot size={20} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121214] animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-brand-cream uppercase tracking-wider leading-none">Lan</h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Assistente do Sistema</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content & History */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    msg.role === 'user' 
                      ? 'bg-white/5 border-white/10 text-white' 
                      : 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold'
                  }`}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-gold text-brand-bg font-bold rounded-tr-none'
                      : 'bg-[#1a1a1f] text-[#dee1e6] border border-white/[0.03] rounded-tl-none whitespace-pre-line'
                  }`}>
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold flex items-center justify-center animate-pulse">
                    <Hourglass size={14} className="animate-spin" />
                  </div>
                  <div className="bg-[#1a1a1f] border border-white/[0.03] px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-brand-gold/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-brand-gold/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-brand-gold/60 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && !isLoading && (
              <div className="px-5 py-2 flex flex-wrap gap-2 bg-[#18181c]/50">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="text-[10px] text-brand-gold border border-brand-gold/20 hover:bg-brand-gold/5 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-tight transition-all text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-4 bg-[#18181c] border-t border-white/5 flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pergunte sobre check-in, financeiro, limpeza..."
                className="flex-1 bg-[#121214] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold/40 placeholder-slate-600 font-medium"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-brand-gold text-brand-bg rounded-xl hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-gold/10 text-xs font-black"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        layout
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-brand-gold text-brand-bg rounded-full flex items-center justify-center shadow-lg shadow-brand-gold/20 hover:scale-110 active:scale-95 transition-all text-xs font-black group"
        title="Ajuda do Sistema"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center relative"
            >
              <MessageSquare size={24} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-brand-gold animate-bounce" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
