import React, { useState, useRef, useEffect } from 'react';
import { StudyPlan, Attachment, Flashcard } from '../types';
import { generateStudyPlan, generateMoreFlashcards, generateMoreQuestions } from '../services/geminiService';

export const StudyPlanGenerator: React.FC = () => {
  // Form State
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [topics, setTopics] = useState('');
  const [hours, setHours] = useState<number>(5);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'flashcards' | 'quiz'>('schedule');
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);

  // Derived State
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [newFlashcardFront, setNewFlashcardFront] = useState('');
  const [newFlashcardBack, setNewFlashcardBack] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (examDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const exam = new Date(examDate);
      const diffTime = exam.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays);
    } else {
      setDaysRemaining(null);
    }
  }, [examDate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type,
          data: base64String
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daysRemaining || daysRemaining < 0) {
      setError("Por favor selecciona una fecha futura válida.");
      return;
    }

    setLoading(true);
    setError(null);
    setPlan(null);
    setFlippedCardIndex(null);
    setActiveTab('schedule');

    try {
      const result = await generateStudyPlan(subject, examDate, daysRemaining, topics, hours, attachments);
      setPlan(result);
    } catch (err) {
      setError("Hubo un error al generar el plan. Inténtalo de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMoreFlashcards = async () => {
    if (!plan) return;
    setMoreLoading(true);
    try {
        const newCards = await generateMoreFlashcards(plan.subject, topics, plan.flashcards.length);
        setPlan(prev => prev ? ({...prev, flashcards: [...prev.flashcards, ...newCards]}) : null);
    } catch(e) {
        console.error(e);
    } finally {
        setMoreLoading(false);
    }
  };

  const handleGenerateMoreQuestions = async () => {
    if (!plan) return;
    setMoreLoading(true);
    try {
        const newQs = await generateMoreQuestions(plan.subject, topics);
        setPlan(prev => prev ? ({...prev, reviewQuestions: [...prev.reviewQuestions, ...newQs]}) : null);
    } catch(e) {
        console.error(e);
    } finally {
        setMoreLoading(false);
    }
  };

  const handleAddManualCard = () => {
    if (newFlashcardFront && newFlashcardBack && plan) {
        const newCard: Flashcard = { front: newFlashcardFront, back: newFlashcardBack };
        setPlan(prev => prev ? ({...prev, flashcards: [newCard, ...prev.flashcards]}) : null);
        setNewFlashcardFront('');
        setNewFlashcardBack('');
        setShowAddCard(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {!plan && (
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-slate-800">Generador de Estudio Maestro</h2>
            <p className="text-slate-500">Sube tus apuntes y déjame organizar tu éxito académico.</p>
          </div>
        )}

        {/* Input Form */}
        {!plan && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Materia</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej. Biología Celular"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Fecha del Examen</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {daysRemaining !== null && (
                    <div className={`text-sm font-medium ${daysRemaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                        {daysRemaining < 0 
                            ? "La fecha ya pasó." 
                            : `Faltan ${daysRemaining} días para el examen.`}
                    </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Temas Clave</label>
                <textarea
                  required
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Mitosis, Meiosis, Ciclo de Krebs..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Apuntes (Opcional)</label>
                <div className="flex flex-col gap-2">
                   <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="application/pdf,image/*"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Subir PDF o Imagen</span>
                  </button>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm">
                          <span className="truncate max-w-[150px]">{att.name}</span>
                          <button type="button" onClick={() => removeAttachment(i)} className="hover:text-red-500">
                             &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Horas/Semana</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2 mt-2">
                <button
                  type="submit"
                  disabled={loading || (daysRemaining !== null && daysRemaining < 0)}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-wait disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculando calendario y estrategia...
                    </span>
                  ) : 'Generar Kit de Estudio'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* Results Dashboard */}
        {plan && (
          <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">{plan.subject}</h2>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-slate-500">{plan.goal}</span>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">
                        Examen en {daysRemaining} días
                    </span>
                </div>
              </div>
              <button 
                onClick={() => setPlan(null)}
                className="text-sm font-medium text-slate-500 hover:text-blue-600 underline"
              >
                Crear Nuevo Plan
              </button>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
               <button 
                onClick={() => setActiveTab('schedule')}
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Calendario
                 {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
               </button>
               <button 
                onClick={() => setActiveTab('flashcards')}
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'flashcards' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Flashcards ({plan.flashcards.length})
                 {activeTab === 'flashcards' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
               </button>
               <button 
                onClick={() => setActiveTab('quiz')}
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'quiz' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Repaso ({plan.reviewQuestions.length})
                 {activeTab === 'quiz' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
               </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
              {/* SCHEDULE VIEW */}
              {activeTab === 'schedule' && (
                <div className="space-y-4">
                  {/* Tips Section */}
                    {plan.tips && plan.tips.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {plan.tips.map((tip, i) => (
                        <div key={i} className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-start gap-3">
                            <span className="text-2xl">💡</span>
                            <p className="text-sm text-yellow-800 font-medium">{tip}</p>
                        </div>
                        ))}
                    </div>
                    )}

                  <div className="grid gap-4">
                    {plan.sessions.map((session, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                        <div className="md:w-32 flex-shrink-0 flex flex-col justify-center items-center bg-blue-50 rounded-lg p-3 text-center">
                            <span className="font-bold text-blue-800 text-lg">{session.day}</span>
                            <span className="text-xs font-semibold text-blue-600 mt-1">{session.durationMinutes} min</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xl font-bold text-slate-800 mb-3">{session.topic}</h4>
                            <div className="space-y-2">
                            {session.activities.map((act, i) => (
                                <div key={i} className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                                <p className="text-slate-600 leading-relaxed">{act}</p>
                                </div>
                            ))}
                            </div>
                        </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FLASHCARDS VIEW */}
              {activeTab === 'flashcards' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-700">Tarjetas de Estudio</h3>
                        <div className="flex gap-2">
                             <button
                                onClick={() => setShowAddCard(!showAddCard)}
                                className="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                             >
                                {showAddCard ? 'Cancelar' : '+ Crear Propia'}
                             </button>
                             <button
                                onClick={handleGenerateMoreFlashcards}
                                disabled={moreLoading}
                                className="text-sm px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                             >
                                {moreLoading ? 'Generando...' : '+ Generar con IA'}
                             </button>
                        </div>
                    </div>
                    
                    {showAddCard && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input 
                                    placeholder="Pregunta / Concepto (Anverso)" 
                                    className="p-3 border rounded-lg"
                                    value={newFlashcardFront}
                                    onChange={(e) => setNewFlashcardFront(e.target.value)}
                                />
                                <input 
                                    placeholder="Respuesta / Definición (Reverso)" 
                                    className="p-3 border rounded-lg"
                                    value={newFlashcardBack}
                                    onChange={(e) => setNewFlashcardBack(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleAddManualCard}
                                disabled={!newFlashcardFront || !newFlashcardBack}
                                className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 disabled:opacity-50"
                            >
                                Añadir Tarjeta
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plan.flashcards.map((card, idx) => (
                        <div 
                        key={idx} 
                        onClick={() => setFlippedCardIndex(flippedCardIndex === idx ? null : idx)}
                        className="group perspective h-64 cursor-pointer"
                        style={{ perspective: '1000px' }}
                        >
                        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d shadow-sm hover:shadow-xl rounded-2xl border border-slate-200 ${flippedCardIndex === idx ? 'rotate-y-180' : ''}`}
                            style={{ transformStyle: 'preserve-3d', transform: flippedCardIndex === idx ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                            
                            {/* Front */}
                            <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl p-6 flex flex-col items-center justify-center text-center"
                                style={{ backfaceVisibility: 'hidden' }}>
                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-4">Anverso</span>
                            <p className="text-lg font-medium text-slate-800 overflow-y-auto max-h-[120px]">{card.front}</p>
                            <p className="text-xs text-slate-400 mt-auto pt-4 group-hover:text-blue-400">Click para voltear</p>
                            </div>

                            {/* Back */}
                            <div className="absolute w-full h-full backface-hidden bg-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center rotate-y-180"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-4">Reverso</span>
                            <p className="text-lg font-medium text-white overflow-y-auto max-h-[140px]">{card.back}</p>
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
              )}

              {/* QUIZ VIEW */}
              {activeTab === 'quiz' && (
                <div className="max-w-3xl mx-auto">
                   <div className="flex justify-end mb-6">
                        <button
                            onClick={handleGenerateMoreQuestions}
                            disabled={moreLoading}
                            className="text-sm px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {moreLoading ? 'Generando...' : '+ Más Preguntas'}
                        </button>
                   </div>

                  <div className="space-y-6">
                    {plan.reviewQuestions.map((q, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                            <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded text-sm">P{idx + 1}</span>
                            <h4 className="text-lg font-semibold text-slate-800">{q.question}</h4>
                            </div>
                            
                            <details className="group">
                            <summary className="flex items-center cursor-pointer text-blue-600 font-medium hover:text-blue-700 select-none">
                                <span>Ver Respuesta</span>
                                <svg className="w-5 h-5 ml-1 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 leading-relaxed animate-fade-in">
                                {q.answer}
                            </div>
                            </details>
                        </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};