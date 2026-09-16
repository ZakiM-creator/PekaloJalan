import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendMessageToGemini } from '../services/geminiService';
import { ItineraryCard } from '../components/ItineraryCard';
import { Sparkles, Send, Bot, User, Trash2, RefreshCw, Compass, Lightbulb } from 'lucide-react';

export const AITripPlannerPage = () => {
  const { chatMessages, setChatMessages, places, pendingAIPrompt, setPendingAIPrompt } = useApp();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  // Handle pending AI prompt coming from PlaceDetailModal or elsewhere
  useEffect(() => {
    if (pendingAIPrompt && !isTyping) {
      const prompt = pendingAIPrompt;
      setPendingAIPrompt(null);
      handleSendMessage(prompt);
    }
  }, [pendingAIPrompt, isTyping]);

  const handleSendMessage = async (customPrompt) => {
    const promptToSend = customPrompt || inputText;
    if (!promptToSend.trim() || isTyping) return;

    const userMessageObj = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message to state immediately
    const updatedMessages = [...chatMessages, userMessageObj];
    setChatMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Build history for Gemini
      const historyFormatted = updatedMessages
        .filter(m => m.id !== 'welcome-1')
        .map(m => ({ role: m.role, text: m.text }));

      // Send to Gemini API / Smart Local Fallback
      const response = await sendMessageToGemini(historyFormatted, promptToSend.trim(), places);

      const aiMessageObj = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: response.text,
        itinerary: response.itinerary,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, aiMessageObj]);
    } catch (err) {
      console.error("AI Error:", err);
      setChatMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'model',
          text: 'Maaf Sedulur, terjadi kendala saat memproses tanggapan. Silakan coba kirim ulang pesan Anda.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus riwayat percakapan chat ini?')) {
      setChatMessages([
        {
          id: 'welcome-1',
          role: 'model',
          text: 'Sugeng Rawuh & Selamat Datang di PekaloJalan AI Trip Planner! 🧳✨\n\nSaya adalah asisten AI pribadi Anda untuk menjelajahi keindahan Kota Pekalongan. Beritahu saya preferensi perjalanan Anda (contoh: *"Saya mau jalan-jalan 1 hari budget 150rb, suka kuliner dan museum batik"*), dan saya akan buatkan rencana perjalanan otomatis!',
          itinerary: null,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const suggestionPrompts = [
    'Rencana 1 Hari Kuliner Megono & Belanja Batik (Budget 150rb)',
    'Wisata Religi Masjid Agung & Sunset Pantai Pasir Kencana',
    'Backpacker Hemat 1 Hari Wisata & Soto Tauto',
    'Liburan Santai Keluarga 2 Hari di Pekalongan'
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 sm:p-6 rounded-3xl border border-amber-500/30 shadow-xl hide-on-print">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>AI Conversational Trip Planner (Multi-turn)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white flex items-center gap-2">
            <span>PekaloJalan AI Chat</span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm">
            Ketik pertanyaan atau minta rekomendasi rencana perjalanan khas Kota Pekalongan secara alami.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            title="Cetak/Simpan ke PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            title="Reset percakapan"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Suggestion Prompt Chips */}
      <div className="space-y-2 hide-on-print">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Contoh Permintaan Cepat (Klik untuk Mencoba):</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestionPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isTyping}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-amber-500/10 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-medium border border-slate-800 transition-all text-left"
            >
              ✨ {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Box */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden flex flex-col h-[650px] shadow-2xl print-chat-container">
        
        {/* Messages Container */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 print-chat-container">
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-md shadow-amber-500/20">
                    <Bot className="w-5 h-5 text-slate-950" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[78%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-none shadow-lg shadow-amber-600/15 print-user-bubble'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none print-ai-bubble'
                    }`}
                  >
                    <p className="whitespace-pre-line font-sans">{msg.text}</p>
                    
                    {/* Render Structured Itinerary Card if present */}
                    {msg.itinerary && (
                      <ItineraryCard 
                        itinerary={msg.itinerary} 
                        onReviseClick={() => {
                          const revisePrompt = "Tolong revisi itinerary di atas, ganti salah satu tempat dengan tempat kuliner/wisata yang lebih hemat atau berbeda.";
                          handleSendMessage(revisePrompt);
                        }}
                      />
                    )}

                    <span className="block text-[10px] opacity-70 text-right mt-2">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                {isUser && (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 items-center hide-on-print">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-slate-950 font-bold shrink-0">
                <Bot className="w-5 h-5 text-slate-950" />
              </div>

              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-xs text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>PekaloJalan AI sedang meracik rekomendasi perjalanan...</span>
                <div className="flex gap-1 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 typing-dot-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 typing-dot-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 typing-dot-3" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 hide-on-print">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tuliskan keinginan liburan Anda (mis. '1 hari di Pekalongan, budget 200rb, suka soto tauto')..."
              className="flex-1 px-4 py-3 sm:py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              disabled={isTyping}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="px-5 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs sm:text-sm hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <span>Kirim</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
