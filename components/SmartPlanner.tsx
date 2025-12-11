import React, { useState, useEffect } from 'react';
import { Task, Priority, OptimizedSchedule } from '../types';
import { estimateTaskDuration, optimizeDailySchedule } from '../services/geminiService';

export const SmartPlanner: React.FC = () => {
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Task State
  // Mock initial data or empty
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Optimization State
  const [optimization, setOptimization] = useState<OptimizedSchedule | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formPriority, setFormPriority] = useState<Priority>('Medium');
  const [formTime, setFormTime] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);

  // Recurrence Form State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]); // 0=Sun, 1=Mon...

  // --- Calendar Logic ---
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setOptimization(null);
  };

  // --- Task Logic ---
  const filteredTasks = tasks.filter(t => t.date === selectedDate);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormTitle(task.title);
      setFormDuration(task.durationMinutes);
      setFormPriority(task.priority);
      setFormTime(task.time || '');
      setIsRecurring(false);
      setRecurringDays([]);
    } else {
      setEditingTask(null);
      setFormTitle('');
      setFormDuration(60);
      setFormPriority('Medium');
      setFormTime('');
      setIsRecurring(false);
      setRecurringDays([]);
    }
    setIsModalOpen(true);
  };

  const handleAiEstimate = async () => {
    if (!formTitle) return;
    setIsEstimating(true);
    try {
      const mins = await estimateTaskDuration(formTitle);
      setFormDuration(mins);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSaveTask = () => {
    if (!formTitle) return;

    if (editingTask) {
      // Update existing
      setTasks(prev => prev.map(t => t.id === editingTask.id ? {
        ...t,
        title: formTitle,
        durationMinutes: formDuration,
        priority: formPriority,
        time: formTime || undefined
      } : t));
    } else {
      // Create New
      const newTasks: Task[] = [];
      const baseId = Date.now().toString();

      if (isRecurring && recurringDays.length > 0) {
        // Generate for next 12 weeks
        const startDate = new Date(selectedDate);
        for (let i = 0; i < 12 * 7; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            if (recurringDays.includes(d.getDay())) {
                const dateStr = d.toISOString().split('T')[0];
                newTasks.push({
                    id: `${baseId}-${i}`,
                    title: formTitle,
                    date: dateStr,
                    durationMinutes: formDuration,
                    priority: formPriority,
                    time: formTime || undefined,
                    completed: false
                });
            }
        }
      } else {
          // Single task
          newTasks.push({
            id: baseId,
            title: formTitle,
            date: selectedDate,
            durationMinutes: formDuration,
            priority: formPriority,
            time: formTime || undefined,
            completed: false
          });
      }
      setTasks(prev => [...prev, ...newTasks]);
    }
    setIsModalOpen(false);
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleOptimize = async () => {
    if (filteredTasks.length === 0) return;
    setIsOptimizing(true);
    try {
      const result = await optimizeDailySchedule(filteredTasks, selectedDate);
      setOptimization(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const toggleRecurringDay = (dayIndex: number) => {
      setRecurringDays(prev => 
        prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
      );
  };

  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // Spanish days initials

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-4 md:p-8 overflow-hidden">
      
      {/* LEFT: Calendar Grid */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h2 className="text-xl font-bold text-slate-800 capitalize">
                {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
            ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
            {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const dayTasks = tasks.filter(t => t.date === dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                    <div 
                        key={day}
                        onClick={() => handleDateClick(day)}
                        className={`
                            relative rounded-xl p-2 cursor-pointer transition-all min-h-[80px] border flex flex-col items-start justify-start
                            ${isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-300'}
                        `}
                    >
                        <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                            {day}
                        </span>
                        <div className="flex flex-col gap-1 w-full">
                            {dayTasks.slice(0, 3).map((t, idx) => (
                                <div key={idx} className={`text-[10px] truncate px-1.5 py-0.5 rounded-sm w-full ${t.completed ? 'bg-slate-100 text-slate-400 line-through' : 'bg-blue-100 text-blue-700'}`}>
                                    {t.time ? `${t.time} ` : ''}{t.title}
                                </div>
                            ))}
                            {dayTasks.length > 3 && (
                                <div className="text-[10px] text-slate-400 pl-1">+{dayTasks.length - 3} más</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* RIGHT: Task List */}
      <div className="w-full md:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800">
                {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p className="text-slate-500 text-sm mb-4">{filteredTasks.length} Tareas planificadas</p>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition-colors shadow-sm shadow-blue-200"
                >
                    + Añadir Tarea
                </button>
                <button 
                    onClick={handleOptimize}
                    disabled={isOptimizing || filteredTasks.length === 0}
                    className="flex-1 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                   {isOptimizing ? '✨ Optimizando...' : '✨ Optimizar Día'}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {optimization && (
                 <div className="mb-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-xl animate-fade-in">
                     <div className="flex items-start gap-2 mb-2">
                         <span className="text-xl">🤖</span>
                         <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide mt-1">Sugerencia AI</p>
                     </div>
                     <p className="text-sm text-slate-700 italic mb-3">"{optimization.advice}"</p>
                     <div className="space-y-1">
                         {optimization.schedule.map((s, i) => (
                             <div key={i} className="text-xs font-mono bg-white/50 px-2 py-1 rounded text-purple-900">{s}</div>
                         ))}
                     </div>
                 </div>
             )}

            {filteredTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <p>No tienes tareas para este día.</p>
                    <p className="text-sm mt-1">¡Aprovecha para descansar o adelantar trabajo!</p>
                </div>
            ) : (
                filteredTasks.map(task => (
                    <div key={task.id} className="group bg-white border border-slate-100 rounded-xl p-3 hover:shadow-md transition-all flex items-center gap-3">
                        <button 
                            onClick={() => toggleTaskCompletion(task.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-blue-400'}`}
                        >
                            {task.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </button>
                        
                        <div className="flex-1 min-w-0" onClick={() => handleOpenModal(task)}>
                            <h4 className={`font-medium truncate cursor-pointer ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {task.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs mt-1">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${
                                    task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja'}
                                </span>
                                <span className="text-slate-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {task.durationMinutes} min
                                </span>
                                {task.time && <span className="text-slate-500 font-mono">{task.time}</span>}
                            </div>
                        </div>

                        <button onClick={() => handleDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                            <input 
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="Ej. Repasar Matemáticas"
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number"
                                        value={formDuration}
                                        onChange={e => setFormDuration(Number(e.target.value))}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button 
                                        onClick={handleAiEstimate}
                                        disabled={!formTitle || isEstimating}
                                        title="Estimar tiempo con IA"
                                        className="bg-purple-100 text-purple-600 p-3 rounded-xl hover:bg-purple-200 transition-colors disabled:opacity-50"
                                    >
                                        {isEstimating ? '...' : '✨'}
                                    </button>
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hora (Opcional)</label>
                                <input 
                                    type="time"
                                    value={formTime}
                                    onChange={e => setFormTime(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Prioridad</label>
                            <div className="flex gap-2">
                                {(['Low', 'Medium', 'High'] as Priority[]).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setFormPriority(p)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                            formPriority === p 
                                                ? (p === 'High' ? 'bg-red-50 border-red-500 text-red-700' : p === 'Medium' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-green-50 border-green-500 text-green-700')
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p === 'High' ? 'Alta' : p === 'Medium' ? 'Media' : 'Baja'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!editingTask && (
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input 
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={e => setIsRecurring(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Repetir semanalmente</span>
                                </label>
                                
                                {isRecurring && (
                                    <div className="flex justify-between gap-1 mt-2">
                                        {weekDays.map((d, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => toggleRecurringDay(i)}
                                                className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${recurringDays.includes(i) ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                )}
                             </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSaveTask}
                            disabled={!formTitle}
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};