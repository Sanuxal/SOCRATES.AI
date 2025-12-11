import React, { useRef, useEffect } from 'react';
import { Message, Role, Attachment } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  pendingAttachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
  onAttachFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSocraticMode: boolean;
  onToggleSocraticMode: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  pendingAttachments,
  onRemoveAttachment,
  onAttachFile,
  isSocraticMode,
  onToggleSocraticMode
}) => {
  const [inputText, setInputText] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && pendingAttachments.length === 0) || isLoading) return;
    onSendMessage(inputText, pendingAttachments);
    setInputText('');
  };

  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc">{line.substring(2)}</li>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold mt-2 mb-1">{line.substring(4)}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
         return <p key={i} className="font-bold my-1">{line.replace(/\*\*/g, '')}</p>
      }
      return <p key={i} className={`min-h-[1.2em] ${line.trim() === '' ? 'h-2' : 'my-1'}`}>{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
      
      {/* Header with Mode Toggle */}
      <div className="bg-white border-b border-slate-100 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSocraticMode ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
            <span className="text-sm font-semibold text-slate-700">
                {isSocraticMode ? 'Modo Socrático' : 'Modo Asistente'}
            </span>
        </div>
        
        <button 
            onClick={onToggleSocraticMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isSocraticMode ? 'bg-purple-600' : 'bg-slate-200'}`}
        >
            <span className="sr-only">Activar modo socrático</span>
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSocraticMode ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-xl font-medium text-slate-600">Bienvenido a SocratesAI</h3>
            <p className="max-w-md mt-2">
                {isSocraticMode 
                    ? "En modo Socrático, te guiaré con preguntas para que aprendas pensando." 
                    : "En modo Asistente, te daré respuestas directas y claras a tus dudas."}
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 ${
                msg.role === Role.USER
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-100 text-slate-800 rounded-bl-none'
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {msg.attachments.map((att, idx) => (
                    <div key={idx} className="relative group bg-black/10 rounded-lg p-1">
                      {att.mimeType.startsWith('image/') ? (
                         <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-20 w-auto rounded" />
                      ) : (
                        <div className="h-20 w-20 flex items-center justify-center bg-white/20 rounded text-xs">
                          DOC
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-sm leading-relaxed">
                {renderMessageContent(msg.text)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length -1]?.role === Role.USER && (
          <div className="flex justify-start">
             <div className="bg-slate-100 rounded-2xl rounded-bl-none px-5 py-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {pendingAttachments.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="relative inline-block bg-slate-50 border rounded-lg p-1">
                 {att.mimeType.startsWith('image/') ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="h-16 w-auto rounded object-cover" />
                 ) : (
                    <div className="h-16 w-16 flex items-center justify-center text-xs text-slate-500 font-mono bg-slate-100 rounded">FILE</div>
                 )}
                 <button 
                  onClick={() => onRemoveAttachment(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                   </svg>
                 </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onAttachFile}
            className="hidden"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            multiple={false} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            title="Adjuntar imagen o PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all border border-transparent focus-within:border-blue-500/30">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isSocraticMode ? "Hazme una pregunta y te guiaré..." : "Pregunta lo que quieras..."}
              className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-slate-700 placeholder:text-slate-400 py-1"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && pendingAttachments.length === 0)}
            className={`p-3 text-white rounded-xl transition-colors shadow-md ${isSocraticMode ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};