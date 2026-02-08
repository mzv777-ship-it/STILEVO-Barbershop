import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Wand2, ArrowLeft, Activity, Save, CreditCard, MessageCircle, Check } from 'lucide-react';
import { AppView, Client, EmotionalProfile, StyleSuggestion, Transaction } from '../types';
import { connectToLiveSession, decodeAudio, playAudioChunk, generateEmotionalAnalysis, generateStyleSuggestions } from '../services/geminiService';

interface SessionProps {
  onBack: () => void;
  activeClient?: Client | null;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

interface ActionLog {
    id: number;
    type: 'contact' | 'payment' | 'reminder';
    message: string;
    timestamp: Date;
}

const Session: React.FC<SessionProps> = ({ onBack, activeClient, onAddTransaction }) => {
  // Live API State
  const [isLive, setIsLive] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  
  // Manual Input State
  const [manualInput, setManualInput] = useState('');
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotionProfile, setEmotionProfile] = useState<EmotionalProfile | null>(null);
  const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);

  // Audio Context Refs
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (outputAudioCtxRef.current) {
        outputAudioCtxRef.current.close();
      }
    };
  }, []);

  const addActionLog = (type: 'contact' | 'payment' | 'reminder', message: string) => {
      setActionLogs(prev => [{
          id: Date.now(),
          type,
          message,
          timestamp: new Date()
      }, ...prev]);
  };

  const toggleLiveSession = async () => {
    if (isLive) {
      window.location.reload(); 
      return;
    }

    try {
      setLiveError(null);
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await connectToLiveSession({
        onMessage: (text) => {
          setTranscripts(prev => [...prev.slice(-4), text]); // Keep last 5 lines
        },
        onAudioData: async (base64) => {
           if (!outputAudioCtxRef.current) return;
           const audioData = decodeAudio(base64);
           nextStartTimeRef.current = Math.max(outputAudioCtxRef.current.currentTime, nextStartTimeRef.current);
           nextStartTimeRef.current = await playAudioChunk(audioData, outputAudioCtxRef.current, nextStartTimeRef.current);
        },
        onClose: () => setIsLive(false),
        onError: (err) => {
          console.error(err);
          setLiveError("Помилка з'єднання. Перевірте дозвіл на мікрофон.");
          setIsLive(false);
        },
        onToolCall: async (toolCall) => {
            const responses = [];
            for (const fc of toolCall.functionCalls) {
                let result = {};
                console.log(`[AI Action] ${fc.name}`, fc.args);

                if (fc.name === 'saveClientContact') {
                    addActionLog('contact', `Збережено контакт: ${fc.args.name} (${fc.args.phone})`);
                    result = { success: true, message: "Контакт збережено." };
                } 
                else if (fc.name === 'processPayment') {
                    const amount = fc.args.amount;
                    addActionLog('payment', `Оброблено платіж (${fc.args.method}): ₴${amount}`);
                    
                    // Add real transaction
                    onAddTransaction({
                        amount: amount,
                        date: new Date().toISOString(),
                        type: 'income',
                        category: 'Service',
                        description: 'Оплата послуги через Live AI',
                        clientName: activeClient?.name || 'Клієнт (Live)',
                        clientId: activeClient?.id,
                        method: fc.args.method
                    });

                    result = { success: true, transactionId: "TX-" + Date.now() };
                }
                else if (fc.name === 'sendReminder') {
                    addActionLog('reminder', `Надіслано нагадування в ${fc.args.platform} до ${fc.args.message.substring(0, 20)}...`);
                    // Simulate opening app
                    if (fc.args.platform === 'whatsapp') {
                         // In a real mobile app, this would use Linking.openURL
                         // For web, we might not want to pop a window automatically during voice chat, 
                         // but we simulate the "action" being taken.
                    }
                    result = { success: true, message: "Нагадування в черзі." };
                }

                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result }
                });
            }
            return responses;
        }
      });
      
      setIsLive(true);
    } catch (e) {
      console.error(e);
      setLiveError("Не вдалося почати аудіо сесію.");
    }
  };

  const handleManualAnalyze = async () => {
    if (!manualInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const profile = await generateEmotionalAnalysis(manualInput);
      setEmotionProfile(profile);
      const styles = await generateStyleSuggestions(profile);
      setStyleSuggestions(styles);
    } catch (e) {
      console.error(e);
      setLiveError("Аналіз не вдався. Спробуйте ще раз.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <button onClick={onBack} className="text-zinc-400 hover:text-white flex items-center gap-2">
          <ArrowLeft size={20} /> Назад
        </button>
        <h2 className="text-white font-serif text-xl">
          {activeClient ? `Сесія: ${activeClient.name}` : 'ШІ Ресепшн та Консультант'}
        </h2>
        <div className="w-8" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Input & Live */}
        <div className="flex-1 p-6 flex flex-col border-r border-zinc-800">
          
          {/* Live Section */}
          <div className="mb-4 p-6 bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-white font-medium text-lg flex items-center gap-2">
                  <Activity size={18} className={isLive ? "text-soul-500" : "text-zinc-600"} />
                  Live Асистент
                </h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Розмовний ШІ. Говорить, слухає, збирає контакти, приймає оплату та надсилає нагадування.
                </p>
              </div>
              <button 
                onClick={toggleLiveSession}
                className={`p-4 rounded-full transition-all ${isLive ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
              >
                {isLive ? <MicOff /> : <Mic />}
              </button>
            </div>

            {/* Visualizer */}
            <div className="h-16 bg-zinc-950 rounded-xl flex items-center justify-center gap-1 mb-4 shrink-0">
              {isLive ? (
                Array.from({ length: 20 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-soul-500 rounded-full animate-bounce"
                    style={{ 
                      height: `${Math.random() * 80 + 20}%`,
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))
              ) : (
                <span className="text-zinc-600 text-sm">Мікрофон вимкнено</span>
              )}
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
              {transcripts.map((t, i) => (
                <div key={i} className="text-sm text-zinc-300 font-medium border-l-2 border-zinc-700 pl-3 py-1">
                  {t}
                </div>
              ))}
              {transcripts.length === 0 && isLive && (
                <p className="text-sm text-zinc-600 italic text-center mt-10">
                    "Привіт! Можна ваше ім'я та номер телефону, будь ласка?"
                </p>
              )}
            </div>

             {/* Action Logs (Feedback from Tool Calls) */}
            <div className="space-y-2">
                {actionLogs.slice(0, 3).map(log => (
                    <div key={log.id} className="bg-zinc-800/50 p-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
                        <div className={`p-1.5 rounded-md ${
                            log.type === 'contact' ? 'bg-blue-500/20 text-blue-400' :
                            log.type === 'payment' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-purple-500/20 text-purple-400'
                        }`}>
                            {log.type === 'contact' && <Save size={12}/>}
                            {log.type === 'payment' && <CreditCard size={12}/>}
                            {log.type === 'reminder' && <MessageCircle size={12}/>}
                        </div>
                        <span className="text-xs text-zinc-300">{log.message}</span>
                        <Check size={12} className="ml-auto text-zinc-500" />
                    </div>
                ))}
            </div>

            {liveError && <p className="text-red-400 text-sm mt-2">{liveError}</p>}
          </div>

          {/* Manual Input (Fallback) */}
          <div className="shrink-0">
             <div className="flex gap-2">
                <textarea
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white resize-none focus:ring-2 focus:ring-soul-500 focus:outline-none h-16 text-sm"
                placeholder="Або введіть нотатки вручну..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                />
                <button
                onClick={handleManualAnalyze}
                disabled={isAnalyzing || !manualInput}
                className="bg-white text-black w-16 rounded-xl flex items-center justify-center hover:bg-zinc-200 disabled:opacity-50"
                >
                {isAnalyzing ? <Activity className="animate-spin" /> : <Wand2 />}
                </button>
             </div>
          </div>
        </div>

        {/* Right Panel: Results (Static Analysis) */}
        <div className="flex-1 p-6 overflow-y-auto bg-black/20">
          {!emotionProfile ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                <Wand2 size={32} className="opacity-20" />
              </div>
              <p>Результати аналізу з'являться тут...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Emotion Profile Card */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-2xl border border-zinc-700">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">Емоційний Профіль</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-zinc-500">Поточний Настрій</div>
                    <div className="text-xl text-white font-serif">{emotionProfile.mood}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Впевненість</div>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < emotionProfile.confidenceLevel ? 'bg-soul-500' : 'bg-zinc-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                   <div>
                    <div className="text-xs text-zinc-500">Контекст</div>
                    <div className="text-sm text-zinc-300">{emotionProfile.context}</div>
                   </div>
                   <div>
                    <div className="text-xs text-zinc-500">Основна Мотивація</div>
                    <div className="text-sm text-zinc-300">{emotionProfile.motivation}</div>
                   </div>
                </div>
              </div>

              {/* Style Suggestions */}
              <div>
                 <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">Рекомендовані Образи</h3>
                 <div className="space-y-4">
                   {styleSuggestions.map((style, idx) => (
                     <div key={idx} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-soul-500 transition-colors cursor-pointer group">
                       <div className="flex justify-between items-start">
                         <h4 className="text-lg font-serif text-white group-hover:text-soul-300 transition-colors">{style.name}</h4>
                         <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{style.emotionalVibe}</span>
                       </div>
                       <p className="text-sm text-zinc-400 mt-2 italic">"{style.visualDescription}"</p>
                       <div className="mt-4 pt-4 border-t border-zinc-800">
                         <p className="text-xs text-soul-400 font-medium">Як презентувати:</p>
                         <p className="text-sm text-zinc-300 mt-1">{style.pitch}</p>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Session;