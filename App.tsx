import React, { useState, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { StudyPlanGenerator } from './components/StudyPlanGenerator';
import { SmartPlanner } from './components/SmartPlanner';
import { AppMode, Message, Role, Attachment } from './types';
import { streamChatResponse } from './services/geminiService';

// Logo Component replicating the Socrates AI Brand
const SocratesLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo_gradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan-400 */}
        <stop offset="100%" stopColor="#2563eb" /> {/* Blue-600 */}
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Circle Ring */}
    <circle cx="50" cy="50" r="40" stroke="url(#logo_gradient)" strokeWidth="8" strokeLinecap="round" />
    
    {/* The 'A' Shape */}
    <path 
      d="M50 25 L72 75 H28 L50 25 Z" 
      stroke="url(#logo_gradient)" 
      strokeWidth="6" 
      strokeLinejoin="round" 
      strokeLinecap="round"
      fill="none"
    />
    <path d="M38 58 H62" stroke="url(#logo_gradient)" strokeWidth="6" strokeLinecap="round" />

    {/* The Swoosh */}
    <path 
      d="M88 35 Q 95 20 80 15 Q 15 5 10 55" 
      stroke="#22d3ee" 
      strokeWidth="4" 
      strokeLinecap="round" 
      opacity="0.8"
      filter="url(#glow)"
    />
  </svg>
);

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: '¡Hola! Soy SócratesAI. ¿En qué materia necesitas ayuda hoy? Puedo ayudarte a resolver problemas, explicarte conceptos o crear un plan de estudio. ¡Sube tus apuntes si los tienes!'
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isSocraticMode, setIsSocraticMode] = useState(false);

  // Handlers for File Upload in Chat
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        const newAttachment: Attachment = {
          name: file.name,
          mimeType: file.type,
          data: base64String
        };
        setPendingAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handler for Sending Message
  const handleSendMessage = useCallback(async (text: string, attachments: Attachment[]) => {
    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: Role.USER,
      text: text,
      attachments: attachments
    };

    setMessages(prev => [...prev, newUserMsg]);
    setPendingAttachments([]); // Clear pending after sending
    setIsChatLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    const botMsgPlaceholder: Message = {
      id: botMsgId,
      role: Role.MODEL,
      text: '',
      isStreaming: true
    };
    
    setMessages(prev => [...prev, botMsgPlaceholder]);

    try {
      const history = messages; 

      await streamChatResponse(history, text, attachments, isSocraticMode, (chunkText) => {
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId ? { ...msg, text: chunkText } : msg
        ));
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId ? { ...msg, text: "Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.", isStreaming: false } : msg
      ));
    } finally {
      setIsChatLoading(false);
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
      ));
    }
  }, [messages, isSocraticMode]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white p-4">
        <div className="flex items-center gap-3 mb-8 px-2 mt-2">
          <SocratesLogo className="w-12 h-12 flex-shrink-0" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SOCRATES AI
            </h1>
            <span className="text-[10px] tracking-widest text-slate-400 uppercase">Educational AI</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setMode(AppMode.CHAT)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              mode === AppMode.CHAT ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="font-medium">Chat Tutor</span>
          </button>

          <button
            onClick={() => setMode(AppMode.PLANNER)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              mode === AppMode.PLANNER ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">Plan de Estudio</span>
          </button>

          <button
            onClick={() => setMode(AppMode.SMART_PLANNER)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              mode === AppMode.SMART_PLANNER ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">Agenda Inteligente</span>
          </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-500">
          <p>© 2024 SocratesAI</p>
          <p>Potenciado por Gemini</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
           <div className="flex items-center gap-2">
             <SocratesLogo className="w-8 h-8" />
             <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-sm">SOCRATES AI</span>
             </div>
           </div>
           <div className="flex gap-2">
             <button 
                onClick={() => setMode(AppMode.CHAT)}
                className={`p-2 rounded-lg ${mode === AppMode.CHAT ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
             </button>
             <button 
                onClick={() => setMode(AppMode.PLANNER)}
                className={`p-2 rounded-lg ${mode === AppMode.PLANNER ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
             </button>
             <button 
                onClick={() => setMode(AppMode.SMART_PLANNER)}
                className={`p-2 rounded-lg ${mode === AppMode.SMART_PLANNER ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-2 md:p-6 max-w-7xl mx-auto w-full">
          {mode === AppMode.CHAT ? (
            <ChatInterface
              messages={messages}
              isLoading={isChatLoading}
              onSendMessage={handleSendMessage}
              pendingAttachments={pendingAttachments}
              onRemoveAttachment={handleRemoveAttachment}
              onAttachFile={handleFileUpload}
              isSocraticMode={isSocraticMode}
              onToggleSocraticMode={() => setIsSocraticMode(!isSocraticMode)}
            />
          ) : mode === AppMode.PLANNER ? (
            <StudyPlanGenerator />
          ) : (
            <SmartPlanner />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;