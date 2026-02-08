
import React, { useState, useEffect, useRef } from 'react';
import { Client, AppView, AdminReminder, Appointment, Transaction, Review } from '../types';
import { Calendar, Scissors, Star, Clock, MapPin, ChevronRight, User, History, Sparkles, ArrowLeft, CheckCircle2, X, CreditCard, Banknote, Gift, Phone, Mic, MicOff, Activity, Bot, UserCheck, PlusCircle, Lock, Loader2, Send, Bell, Trash2, AlertTriangle, ThumbsUp } from 'lucide-react';
import { connectToLiveSession, decodeAudio, playAudioChunk, RECEPTIONIST_INSTRUCTION, RECEPTION_TOOLS } from '../services/geminiService';

interface ClientHomeProps {
  client: Client;
  appointments?: Appointment[];
  onNavigate: (view: AppView) => void;
  isPreview?: boolean;
  onBookAppointment?: (data: { serviceName: string; date: string; time: string; price: number; clientName: string; clientPhone: string; paymentMethod: 'card' | 'cash', targetClientId?: string }) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onAddReminder?: (reminder: Omit<AdminReminder, 'id' | 'status' | 'createdAt'>) => void;
  onAddTransaction?: (transaction: Omit<Transaction, 'id'>) => void;
  onAddReview?: (review: Review) => void;
}

const BARBERS = [
    { id: 1, name: 'Дмитро', role: 'Top Barber', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=200&auto=format&fit=crop' },
];

const SERVICES = [
    { id: 1, name: 'Стрижка голови', price: 600, duration: '60 хв' },
    { id: 2, name: 'Стрижка голови + бороди', price: 800, duration: '90 хв' },
    { id: 3, name: 'Моделювання бороди', price: 400, duration: '45 хв' },
];

// Schedule: 10:00 - 18:00
const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const DATES = ['Сьогодні', 'Завтра', 'Пн', 'Вт', 'Ср', 'Чт']; // Mon-Sat typical view

const ClientHome: React.FC<ClientHomeProps> = ({ client, appointments = [], onNavigate, isPreview = false, onBookAppointment, onCancelAppointment, onAddReminder, onAddTransaction, onAddReview }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'booking' | 'loyalty'>('home');
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // New Booking States
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  
  // Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null); // Stores appointment ID to cancel
  
  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Card Input States (for demo visual only)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');


  // --- AI Call State ---
  const [isAiCallActive, setIsAiCallActive] = useState(false);
  const [aiConnectionStatus, setAiConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // AI Notification State
  const [aiBookingConfirmed, setAiBookingConfirmed] = useState<string | null>(null);
  const [telegramNotificationSent, setTelegramNotificationSent] = useState(false);

  // --- Telegram Integration ---
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const isTelegram = !!tg?.initData;

  // Loyalty Calculation
  const currentVisits = client.visitsCount || 0;
  const stamps = currentVisits % 6;
  const isNextVisitFree = (currentVisits + 1) % 6 === 0;
  const visitsLeft = isNextVisitFree ? 0 : 6 - (stamps + 1);
  const isNewClient = currentVisits === 0;

  const calculateTotalPrice = () => {
    if (!selectedService) return 0;
    const servicePrice = SERVICES.find(s => s.id === selectedService)?.price || 0;
    let total = 0;
    for (let i = 0; i < selectedDates.length; i++) {
        // First selected date corresponds to currentVisits + 1
        const visitNum = currentVisits + i + 1;
        if (visitNum % 6 !== 0) {
            total += servicePrice;
        }
    }
    return total;
  };

  const totalPrice = calculateTotalPrice();

  useEffect(() => {
    // Check if we have Telegram user data
    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        if (!bookingName) setBookingName(displayName);
        // We assume Telegram might provide this via requestContact in a real bot, 
        // but for web app we rely on manual input or existing data.
    } else if (!isNewClient) {
        setBookingName(client.name);
        setBookingPhone(client.phone || '');
    }
  }, [client, isNewClient, tg]);

  useEffect(() => {
      // Cleanup audio context on unmount
      return () => {
          if (outputAudioCtxRef.current) {
              outputAudioCtxRef.current.close();
          }
      };
  }, []);

  // --- Telegram Main Button & Back Button Logic ---
  useEffect(() => {
    if (!tg) return;

    const mainButton = tg.MainButton;
    const backButton = tg.BackButton;

    // --- Back Button Handler ---
    const handleBackBtnClick = () => {
        if (activeTab !== 'home') {
            setActiveTab('home');
        }
    };
    backButton.onClick(handleBackBtnClick);

    // Show/Hide Back Button based on tab
    if (activeTab !== 'home') {
        backButton.show();
    } else {
        backButton.hide();
    }

    // --- Main Button Handler ---
    const handleMainBtnClick = () => {
        if (activeTab === 'booking' && selectedTime && bookingName && bookingPhone) {
             initiateBooking();
        }
    };

    mainButton.onClick(handleMainBtnClick);

    // Logic to show/hide/enable MainButton based on state
    if (activeTab === 'booking') {
        if (selectedBarber && selectedService && selectedDates.length > 0 && selectedTime && bookingName && bookingPhone) {
            mainButton.setText(totalPrice === 0 ? 'ПІДТВЕРДИТИ (БЕЗКОШТОВНО)' : `ОПЛАТИТИ ${totalPrice} ₴`);
            mainButton.show();
            mainButton.enable();
        } else if (selectedBarber) {
             mainButton.hide(); 
        } else {
             mainButton.hide();
        }
    } else {
        mainButton.hide();
    }

    return () => {
        mainButton.offClick(handleMainBtnClick);
        mainButton.hide();
        backButton.offClick(handleBackBtnClick);
        backButton.hide();
    };
  }, [tg, activeTab, selectedBarber, selectedService, selectedDates, selectedTime, bookingName, bookingPhone, totalPrice]);

  const handleCallMaster = () => {
      window.location.href = 'tel:+380660121041';
  };

  const startAiReceptionCall = async () => {
      if (aiConnectionStatus === 'connected' || aiConnectionStatus === 'connecting') return;
      
      if (isTelegram) {
          tg?.HapticFeedback.impactOccurred('medium');
      }

      setAiConnectionStatus('connecting');
      setIsAiCallActive(true);
      setAiBookingConfirmed(null);
      setTelegramNotificationSent(false);

      try {
          outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          
          await connectToLiveSession({
              onMessage: (text) => console.log(text),
              onAudioData: async (base64) => {
                  if (!outputAudioCtxRef.current) return;
                  const audioData = decodeAudio(base64);
                  nextStartTimeRef.current = Math.max(outputAudioCtxRef.current.currentTime, nextStartTimeRef.current);
                  nextStartTimeRef.current = await playAudioChunk(audioData, outputAudioCtxRef.current, nextStartTimeRef.current);
              },
              onClose: () => {
                  setAiConnectionStatus('idle');
                  setIsAiCallActive(false);
              },
              onError: (err) => {
                  console.error(err);
                  setAiConnectionStatus('error');
                  setTimeout(() => {
                      setIsAiCallActive(false);
                      setAiConnectionStatus('idle');
                  }, 2000);
              },
              onToolCall: async (toolCall) => {
                  const responses = [];
                  for (const fc of toolCall.functionCalls) {
                      if (fc.name === 'createAppointmentRequest') {
                          console.log("AI Receptionist Request:", fc.args);
                          
                          // 1. Determine Price based on service string similarity or default
                          const serviceLower = fc.args.service.toLowerCase();
                          let matchedService = SERVICES.find(s => serviceLower.includes(s.name.toLowerCase()));
                          if (!matchedService && serviceLower.includes('борода')) matchedService = SERVICES.find(s => s.id === 2);
                          if (!matchedService) matchedService = SERVICES[0]; // Default

                          // 2. ACTUALLY BOOK IT (Appears in Dashboard)
                          if (onBookAppointment) {
                              onBookAppointment({
                                  serviceName: fc.args.service, // Use the specific text user said
                                  date: fc.args.date,
                                  time: fc.args.time,
                                  price: matchedService.price,
                                  clientName: fc.args.clientName,
                                  clientPhone: fc.args.clientPhone,
                                  paymentMethod: 'cash', // Default for phone booking
                                  targetClientId: client.id
                              });
                          }

                          // 3. Create Reminder (For admin list)
                          // Changed to instant notification per user request
                          const notificationTime = new Date();

                          if (onAddReminder) {
                              onAddReminder({
                                  clientName: fc.args.clientName,
                                  clientPhone: fc.args.clientPhone,
                                  service: fc.args.service,
                                  requestedDate: fc.args.date,
                                  requestedTime: fc.args.time,
                                  telegramReminderTime: notificationTime.toISOString()
                              });
                          }
                          
                          setAiBookingConfirmed(`Запис на ${fc.args.time} підтверджено!`);
                          setTelegramNotificationSent(true);

                          // Simulate Sending to Telegram API
                          console.log(`%c[TELEGRAM API] Sending notification to @D_Nakaznyi: "Новий запис: ${fc.args.clientName} на ${fc.args.time} (${fc.args.service})"`, "color: #0088cc; font-weight: bold;");

                          responses.push({
                              id: fc.id,
                              name: fc.name,
                              response: { result: "success", message: "Запис створено. Повідомлення майстру Дмитру (@D_Nakaznyi) надіслано." }
                          });
                      }
                  }
                  return responses;
              }
          }, RECEPTIONIST_INSTRUCTION, RECEPTION_TOOLS);

          setAiConnectionStatus('connected');
      } catch (error) {
          console.error("AI Connection failed", error);
          setAiConnectionStatus('error');
          setTimeout(() => {
              setIsAiCallActive(false);
              setAiConnectionStatus('idle');
          }, 2000);
      }
  };

  const endAiConsultation = () => {
      if (isTelegram) tg?.HapticFeedback.impactOccurred('light');
      setIsAiCallActive(false);
      setAiConnectionStatus('idle');
      if (outputAudioCtxRef.current) {
          outputAudioCtxRef.current.close();
          outputAudioCtxRef.current = null;
      }
  };

  const initiateBooking = () => {
      if (isTelegram) tg?.HapticFeedback.notificationOccurred('success');
      if (paymentMethod === 'card' && totalPrice > 0) {
          setShowPaymentModal(true);
      } else {
          finalizeBooking();
      }
  };

  const processPayment = () => {
      setIsProcessingPayment(true);
      if (isTelegram) tg?.MainButton.showProgress(false);

      setTimeout(() => {
          setIsProcessingPayment(false);
          setShowPaymentModal(false);
          if (isTelegram) tg?.MainButton.hideProgress();
          finalizeBooking();
      }, 2000);
  };

  const finalizeBooking = () => {
    const serviceObj = SERVICES.find(s => s.id === selectedService);

    // 1. Transaction Logic (Card Payment)
    if (paymentMethod === 'card' && totalPrice > 0 && onAddTransaction) {
        onAddTransaction({
            amount: totalPrice,
            date: new Date().toISOString(),
            type: 'income',
            category: 'Service',
            description: `Онлайн оплата: ${selectedDates.length} послуг(и) (${serviceObj?.name || 'Стрижка'})`,
            clientName: bookingName,
            clientId: client.id,
            method: 'card'
        });
    }

    // 2. Booking Logic
    if (onBookAppointment && selectedService && selectedDates.length > 0 && selectedTime) {
        if (serviceObj) {
            // Iterate through all selected dates
            selectedDates.forEach((date) => {
                onBookAppointment({
                    serviceName: serviceObj.name,
                    date: date,
                    time: selectedTime,
                    price: serviceObj.price, // Pass unit price, App.tsx handles free logic for specific appointments
                    clientName: bookingName,
                    clientPhone: bookingPhone,
                    paymentMethod: paymentMethod,
                    targetClientId: client.id
                });

                // Simulate instant notification to Master Telegram for each
                if (onAddReminder) {
                    onAddReminder({
                        clientName: bookingName,
                        clientPhone: bookingPhone,
                        service: serviceObj.name,
                        requestedDate: date,
                        requestedTime: selectedTime,
                        telegramReminderTime: new Date().toISOString()
                    });
                }
                console.log(`%c[TELEGRAM API] Sending notification to @D_Nakaznyi: "Новий запис (Web): ${bookingName} на ${date} ${selectedTime} (${serviceObj.name})"`, "color: #0088cc; font-weight: bold;");
            });
        }
    }

    setShowSuccessModal(true);
    if (isTelegram) {
        tg?.HapticFeedback.notificationOccurred('success');
        tg?.MainButton.hide();
    }
    
    setTimeout(() => {
        setShowSuccessModal(false);
        setActiveTab('home');
        setSelectedBarber(null);
        setSelectedService(null);
        setSelectedDates([]);
        setSelectedTime(null);
    }, 2500);
  };

  const handleQuickBook = () => {
      if (isTelegram) tg?.HapticFeedback.selectionChanged();
      setSelectedBarber(1); // Select Dmitry by default
      setActiveTab('booking');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '').substring(0, 16);
      const parts = [];
      for(let i=0; i<val.length; i+=4) {
          parts.push(val.substring(i, i+4));
      }
      setCardNumber(parts.join(' '));
  };
  
  const submitReview = () => {
      if (reviewRating === 0 || !reviewComment.trim()) return;
      
      if (onAddReview) {
          onAddReview({
              id: Date.now().toString(),
              clientId: client.id,
              barberName: 'Дмитро',
              serviceName: 'Стрижка + Борода', // Mock past service
              rating: reviewRating,
              comment: reviewComment,
              date: new Date().toISOString()
          });
      }
      
      setReviewSuccess(true);
      setTimeout(() => {
          setReviewSuccess(false);
          setShowReviewModal(false);
          setReviewRating(0);
          setReviewComment('');
      }, 2000);
  };

  // --- Cancellation Logic ---
  const canCancel = (date: string, time: string): boolean => {
      // Mock Logic:
      // If date is NOT "Сьогодні", assume it's tomorrow or later -> Allowed.
      // If date IS "Сьогодні", calculate hours difference.
      if (date !== 'Сьогодні') return true;
      
      const now = new Date();
      const currentHour = now.getHours();
      const [apptHour] = time.split(':').map(Number);
      
      // Allow cancellation if > 3 hours remaining
      return (apptHour - currentHour) >= 3;
  };

  const confirmCancel = () => {
      if (showCancelModal && onCancelAppointment) {
          const appt = appointments.find(a => a.id === showCancelModal);
          onCancelAppointment(showCancelModal);
          setShowCancelModal(null);
          
          if(isTelegram) tg?.HapticFeedback.notificationOccurred('warning');
          
          // Simulate Telegram Notification to Master
          if (appt) {
             console.log(`%c[TELEGRAM API] @D_Nakaznyi: Клієнт ${client.name} СКАСУВАВ запис на ${appt.date} о ${appt.time}.`, "color: red; font-weight: bold;");
          }
      }
  };

  const renderHome = () => (
    <div className="space-y-6">
        
        {/* Active Appointments Section */}
        {appointments.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> Ваші записи
                </h3>
                <div className="space-y-3">
                    {appointments.map(appt => (
                        <div key={appt.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                             {/* Decoration */}
                             <div className={`absolute top-0 left-0 w-1 h-full ${appt.isFree ? 'bg-emerald-500' : 'bg-soul-500'}`}></div>
                             
                             <div className="flex justify-between items-start pl-3">
                                 <div>
                                     <h4 className="text-white font-medium text-lg">{appt.serviceName}</h4>
                                     <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                                         <Clock size={14} /> {appt.date}, {appt.time}
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <div className={`font-bold ${appt.isFree ? 'text-emerald-500' : 'text-white'}`}>
                                         {appt.isFree ? 'FREE' : `₴${appt.price}`}
                                     </div>
                                     <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wide">
                                         {appt.status}
                                     </div>
                                 </div>
                             </div>

                             <div className="pl-3 pt-3 border-t border-zinc-800/50 flex justify-between items-center">
                                 <div className="flex items-center gap-2 text-xs text-zinc-500">
                                     <User size={12} /> Майстер Дмитро
                                 </div>
                                 
                                 {/* Cancel Button */}
                                 {canCancel(appt.date, appt.time) ? (
                                     <button 
                                        onClick={() => setShowCancelModal(appt.id)}
                                        className="text-red-400 text-xs hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-red-500/20"
                                     >
                                         <Trash2 size={12} /> Скасувати
                                     </button>
                                 ) : (
                                     <span className="text-zinc-600 text-[10px] italic">Скасування недоступне (менше 3 год)</span>
                                 )}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* Recent History / Review Prompt */}
        <div className="space-y-3">
             <h3 className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <History size={12} /> Недавні відвідування
             </h3>
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                 <div>
                     <div className="text-white font-medium">Стрижка + Борода</div>
                     <div className="text-xs text-zinc-500 mt-1">Вчора • Майстер Дмитро</div>
                 </div>
                 {/* Only show review button if user has NO reviews in mock data to avoid spamming demo */}
                 {(!client.reviews || client.reviews.length === 0) ? (
                    <button 
                        onClick={() => setShowReviewModal(true)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1 transition-colors"
                    >
                        <Star size={12} /> Оцінити
                    </button>
                 ) : (
                    <div className="flex items-center gap-1 text-soul-400 text-xs font-medium bg-soul-500/10 px-2 py-1 rounded">
                        <CheckCircle2 size={12} /> Оцінено
                    </div>
                 )}
             </div>
        </div>

        {/* AI Receptionist Call Card */}
        <div onClick={startAiReceptionCall} className="bg-gradient-to-r from-indigo-900 to-soul-900 rounded-2xl p-6 border border-indigo-700/50 shadow-lg relative overflow-hidden group cursor-pointer">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h2 className="text-white font-serif text-xl mb-1 flex items-center gap-2">
                        <Phone size={20} className="text-indigo-300" />
                        Подзвонити Адміністратору
                    </h2>
                    <p className="text-indigo-200 text-xs max-w-[200px]">
                        ШІ-Марія прийме ваш дзвінок, запише на стрижку та сповістить майстра Дмитра.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-white font-medium border border-white/20 group-hover:bg-white/20 transition-colors">
                        <Activity size={12} className="animate-pulse" /> Натисніть для дзвінка
                    </div>
                </div>
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-400/30 text-white shadow-inner animate-pulse">
                    <Phone size={24} />
                </div>
            </div>
        </div>

        {/* Quick Booking Card */}
        <div 
            onClick={handleQuickBook}
            className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-1 border border-zinc-700 shadow-lg relative overflow-hidden group cursor-pointer"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-600/20"></div>
            
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-5 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-emerald-400 text-xs uppercase tracking-wider mb-1 font-bold">Запис</p>
                        <h2 className="text-white font-serif text-2xl">Записатись онлайн</h2>
                    </div>
                    <div className="bg-emerald-600 text-white p-2 rounded-lg shadow-lg shadow-emerald-900/50 group-hover:scale-110 transition-transform">
                        <PlusCircle size={20} />
                    </div>
                </div>
                
                <div className="flex items-center gap-2 text-zinc-300 text-sm mb-4">
                    <UserCheck size={14} className="text-emerald-400" />
                    <span>До майстра: <span className="text-white font-medium">Дмитро</span></span>
                </div>

                <button className="w-full bg-zinc-800 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 group-hover:border-emerald-500/50 group-hover:text-emerald-400">
                    Обрати час в додатку
                </button>
            </div>
        </div>

        {/* Quick Loyalty Status */}
        <div 
            onClick={() => {
                if(isTelegram) tg?.HapticFeedback.selectionChanged();
                setActiveTab('loyalty');
            }}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-soul-500/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full">
                    <Star size={18} />
                </div>
                <div>
                    <h3 className="text-white text-sm font-medium">Бонусний рахунок</h3>
                    {isNextVisitFree ? (
                        <p className="text-emerald-400 text-xs font-bold animate-pulse">Цей візит безкоштовний!</p>
                    ) : (
                         <p className="text-zinc-500 text-xs">До безкоштовної стрижки: {visitsLeft} візити</p>
                    )}
                </div>
            </div>
            <ChevronRight size={16} className="text-zinc-500" />
        </div>
    </div>
  );

  const renderBooking = () => (
    <div className="space-y-6 pb-8">
        <h2 className="text-xl font-serif text-white">Записатись</h2>

        {/* Step 1: Barber Selection */}
        <div className="space-y-3">
            <h3 className="text-xs text-zinc-500 uppercase tracking-widest">Майстер</h3>
            <div className="grid grid-cols-2 gap-3">
                {BARBERS.map(barber => (
                    <div 
                        key={barber.id}
                        onClick={() => {
                            if(isTelegram) tg?.HapticFeedback.selectionChanged();
                            if (selectedBarber === barber.id) {
                                setSelectedBarber(null); // Deselect
                                setSelectedService(null);
                            } else {
                                setSelectedBarber(barber.id);
                            }
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedBarber === barber.id ? 'bg-soul-600/20 border-soul-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    >
                        <img src={barber.avatar} alt={barber.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700"/>
                        <div>
                            <div className={`font-medium text-sm ${selectedBarber === barber.id ? 'text-soul-300' : 'text-zinc-200'}`}>{barber.name}</div>
                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                                <Star size={10} className="text-amber-500 fill-amber-500"/> {barber.rating}
                            </div>
                        </div>
                        {selectedBarber === barber.id && <CheckCircle2 size={18} className="text-soul-500 ml-auto" />}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Step 2: Services */}
        {selectedBarber && (
            <div className="space-y-3">
                <h3 className="text-xs text-zinc-500 uppercase tracking-widest">Послуга</h3>
                <div className="space-y-2">
                    {SERVICES.map(service => (
                        <div 
                            key={service.id}
                            onClick={() => {
                                if(isTelegram) tg?.HapticFeedback.selectionChanged();
                                setSelectedService(service.id);
                            }}
                            className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${selectedService === service.id ? 'bg-soul-600/20 border-soul-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                        >
                            <div>
                                <div className={`font-medium ${selectedService === service.id ? 'text-soul-300' : 'text-zinc-200'}`}>{service.name}</div>
                                <div className="text-xs text-zinc-500 mt-1">{service.duration}</div>
                            </div>
                            <div className="text-white font-medium">
                                {isNextVisitFree ? (
                                    <div className="flex flex-col items-end">
                                        <s className="text-zinc-500 text-xs">₴{service.price}</s>
                                        <span className="text-emerald-500 font-bold">БЕЗКОШТОВНО</span>
                                    </div>
                                ) : (
                                    <>₴{service.price}</>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Step 3: Dates */}
        {selectedService && (
            <div className="space-y-3">
                <h3 className="text-xs text-zinc-500 uppercase tracking-widest">Дата (можна обрати декілька)</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {DATES.map((date, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if(isTelegram) tg?.HapticFeedback.selectionChanged();
                                setSelectedDates(prev => {
                                    if (prev.includes(date)) return prev.filter(d => d !== date);
                                    return [...prev, date];
                                });
                            }}
                            className={`min-w-[80px] p-3 rounded-xl border text-center transition-all ${selectedDates.includes(date) ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                        >
                            <span className="text-sm font-medium">{date}</span>
                            {selectedDates.includes(date) && <div className="mt-1 w-1.5 h-1.5 bg-emerald-500 rounded-full mx-auto"></div>}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Step 4: Time */}
        {selectedDates.length > 0 && (
             <div className="space-y-3">
                <h3 className="text-xs text-zinc-500 uppercase tracking-widest">Час (для всіх дат)</h3>
                <div className="grid grid-cols-3 gap-2">
                    {TIMES.map((time, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if(isTelegram) tg?.HapticFeedback.selectionChanged();
                                setSelectedTime(time);
                            }}
                            className={`p-2 rounded-lg border text-sm transition-all ${selectedTime === time ? 'bg-soul-600 border-soul-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                        >
                            {time}
                        </button>
                    ))}
                </div>
             </div>
        )}

        {/* Step 5: Contact Info & Payment */}
        {selectedTime && selectedDates.length > 0 && (
            <div className="space-y-6">
                <hr className="border-zinc-800" />
                
                <div className="space-y-3">
                    <h3 className="text-xs text-zinc-500 uppercase tracking-widest">Ваші Контакти</h3>
                    <div className="space-y-2">
                         <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                                type="text"
                                placeholder="Ваше ім'я"
                                value={bookingName}
                                onChange={(e) => setBookingName(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-10 text-white focus:ring-1 focus:ring-soul-500 focus:outline-none text-sm"
                            />
                         </div>
                         <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                                type="tel"
                                placeholder="Номер телефону"
                                value={bookingPhone}
                                onChange={(e) => setBookingPhone(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-10 text-white focus:ring-1 focus:ring-soul-500 focus:outline-none text-sm"
                            />
                         </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs text-zinc-500 uppercase tracking-widest">Оплата</h3>
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                        <span className="text-zinc-300 text-sm">Сума до сплати:</span>
                        <div className="text-right">
                             {totalPrice === 0 ? (
                                <span className="text-xl font-bold text-emerald-500">БЕЗКОШТОВНО</span>
                             ) : (
                                <span className="text-xl font-bold text-white">₴{totalPrice}</span>
                             )}
                             {selectedDates.length > 1 && (
                                 <div className="text-xs text-zinc-500">{selectedDates.length} запис(и)</div>
                             )}
                        </div>
                    </div>
                    
                    {totalPrice > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    if(isTelegram) tg?.HapticFeedback.selectionChanged();
                                    setPaymentMethod('card');
                                }}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-soul-600/20 border-soul-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                            >
                                <CreditCard size={20} />
                                <span className="text-xs font-medium">Картою Online</span>
                            </button>
                            <button
                                onClick={() => {
                                    if(isTelegram) tg?.HapticFeedback.selectionChanged();
                                    setPaymentMethod('cash');
                                }}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-soul-600/20 border-soul-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                            >
                                <Banknote size={20} />
                                <span className="text-xs font-medium">В салоні</span>
                            </button>
                        </div>
                    )}
                </div>

                {!isTelegram && (
                    <button 
                        disabled={!selectedBarber || !selectedService || selectedDates.length === 0 || !selectedTime || !bookingName || !bookingPhone}
                        onClick={initiateBooking}
                        className="w-full bg-soul-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-soul-900/20 transition-all mt-4 disabled:cursor-not-allowed"
                    >
                        {totalPrice === 0 ? 'Підтвердити безкоштовний запис' : (paymentMethod === 'card' ? `Оплатити ${totalPrice} ₴ та Записатись` : 'Підтвердити Запис')}
                    </button>
                )}
                 {isTelegram && (
                     <p className="text-center text-xs text-zinc-500 mt-4 pb-12">
                         Натисніть кнопку внизу екрану, щоб продовжити
                     </p>
                 )}
            </div>
        )}
    </div>
  );

  const renderLoyalty = () => (
      <div className="space-y-8">
          <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif text-white">Клуб STILEVO</h2>
              <p className="text-zinc-400 text-sm">Ваша персональна картка лояльності</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full"></div>
               <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                   {Array.from({ length: 6 }).map((_, i) => {
                       const isStamped = i < stamps;
                       const isCurrentFreeTarget = i === 5;
                       return (
                       <div key={i} className={`aspect-square rounded-full border-2 ${isStamped ? 'border-soul-500' : 'border-dashed border-zinc-700'} flex items-center justify-center relative transition-all duration-500`}>
                           {isStamped ? (
                               <div className="w-full h-full bg-gradient-to-tr from-soul-600 to-amber-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                                   <Scissors size={20} />
                               </div>
                           ) : isCurrentFreeTarget ? (
                               <div className="flex flex-col items-center justify-center text-center">
                                   <span className="text-amber-500 font-bold text-xs">FREE</span>
                                   <Gift size={16} className="text-amber-500 mt-1" />
                               </div>
                           ) : (
                               <span className="text-zinc-700 font-medium text-sm">{i + 1}</span>
                           )}
                           {isCurrentFreeTarget && isNextVisitFree && <div className="absolute inset-0 border-2 border-amber-500 rounded-full animate-pulse"></div>}
                       </div>
                   )})}
               </div>
               <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
                   <div className="text-sm text-zinc-300">Наступна винагорода:</div>
                   <div className="text-white font-medium bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
                       6-та послуга безкоштовно
                   </div>
               </div>
          </div>
      </div>
  );

  return (
    <div className={`max-w-md mx-auto bg-zinc-950 min-h-screen pb-24 relative ${isPreview ? '' : 'border-x border-zinc-900 shadow-2xl'}`}>
      
      {/* Simulation Header - Only visible in Preview Mode */}
      {isPreview && (
        <div className="bg-zinc-900/50 p-2 text-center text-xs text-zinc-500 uppercase tracking-widest border-b border-zinc-800 sticky top-0 z-50 backdrop-blur">
          Симуляція: Інтерфейс Клієнта (Демо: {client.name})
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-6 pb-2 flex justify-between items-center">
        <div className="flex items-center gap-3">
            {isNewClient ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-soul-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-soul-900/20">
                    <span className="font-serif font-bold text-white text-lg">S</span>
                </div>
            ) : (
                <img src={client.avatarUrl} alt={client.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-soul-600/50" />
            )}
            <div>
                {isNewClient ? (
                    <>
                        <h1 className="text-white font-serif text-lg leading-tight">Вітаємо в STILEVO</h1>
                        <p className="text-zinc-500 text-xs">Запишіться на першу стрижку</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-white font-serif text-lg leading-tight">Привіт, {client.name.split(' ')[0]}</h1>
                        <p className="text-zinc-500 text-xs">Учасник клубу • {currentVisits} візитів</p>
                    </>
                )}
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleCallMaster}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded-full text-green-500 hover:text-green-400 hover:border-green-500/50 transition-colors shadow-lg animate-pulse"
                title="Подзвонити Майстру"
            >
                <Phone size={18} />
            </button>
            <button className="bg-zinc-900 border border-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white transition-colors">
                <User size={18} />
            </button>
        </div>
      </header>

      <div className="p-6">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'booking' && renderBooking()}
        {activeTab === 'loyalty' && renderLoyalty()}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                {reviewSuccess ? (
                    <div className="text-center py-6">
                         <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ThumbsUp size={32} />
                        </div>
                        <h3 className="text-2xl font-serif text-white mb-2">Дякуємо!</h3>
                        <p className="text-zinc-400">Ваш відгук допомагає нам ставати кращими.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-white">Як пройшов візит?</h3>
                            <button onClick={() => setShowReviewModal(false)}><X size={20} className="text-zinc-500 hover:text-white"/></button>
                        </div>
                        
                        <div className="mb-6 flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star 
                                        size={32} 
                                        className={`${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} 
                                        strokeWidth={1.5}
                                    />
                                </button>
                            ))}
                        </div>
                        
                        <div className="mb-6">
                            <label className="text-xs text-zinc-500 uppercase font-medium mb-2 block">Коментар (Необов'язково)</label>
                            <textarea 
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white placeholder-zinc-700 focus:ring-1 focus:ring-soul-500 focus:outline-none text-sm resize-none h-24"
                                placeholder="Що вам сподобалось найбільше?"
                            />
                        </div>
                        
                        <button 
                            onClick={submitReview}
                            disabled={reviewRating === 0}
                            className="w-full bg-soul-600 hover:bg-soul-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-soul-900/20"
                        >
                            Надіслати Відгук
                        </button>
                    </>
                )}
            </div>
        </div>
      )}

      {/* Full Screen AI Call Overlay */}
      {isAiCallActive && (
          <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-300">
              <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Background Effects */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-soul-600/20 rounded-full blur-[100px] animate-pulse"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]" style={{animationDelay: '1s'}}></div>
                  
                  {/* Avatar / Visualizer */}
                  <div className="relative z-10 flex flex-col items-center gap-8">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-2xl relative">
                          <Bot size={48} className="text-white/80" />
                          
                          {/* Ripple Rings */}
                          {aiConnectionStatus === 'connected' && (
                              <>
                                <div className="absolute inset-0 border border-soul-500/30 rounded-full animate-ping" style={{animationDuration: '2s'}}></div>
                                <div className="absolute inset-0 border border-indigo-500/30 rounded-full animate-ping" style={{animationDuration: '2s', animationDelay: '0.5s'}}></div>
                              </>
                          )}
                      </div>

                      <div className="text-center space-y-2">
                          <h2 className="text-2xl font-serif text-white">Адміністратор Марія (AI)</h2>
                          <p className="text-zinc-400 text-sm">
                              {aiConnectionStatus === 'connecting' ? 'З\'єднання...' : 
                               aiConnectionStatus === 'error' ? 'Помилка' : 
                               'Слухаю вас...'}
                          </p>
                      </div>

                      {/* AI Action Confirmation Toast */}
                      {aiBookingConfirmed && (
                          <div className="bg-emerald-500/20 border border-emerald-500/30 px-6 py-3 rounded-full flex items-center gap-2 animate-in slide-in-from-bottom-5">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                              <div className="text-sm font-medium text-emerald-200">{aiBookingConfirmed}</div>
                          </div>
                      )}
                      
                      {/* Telegram Sent Toast */}
                      {telegramNotificationSent && (
                          <div className="bg-blue-500/20 border border-blue-500/30 px-6 py-3 rounded-full flex items-center gap-2 animate-in slide-in-from-bottom-5">
                              <Send size={16} className="text-blue-500" />
                              <div className="text-sm font-medium text-blue-200">Сповіщено @D_Nakaznyi</div>
                          </div>
                      )}

                      {/* Visualizer Bars */}
                      <div className="h-12 flex items-center gap-1">
                        {aiConnectionStatus === 'connected' ? (
                            Array.from({ length: 12 }).map((_, i) => (
                            <div 
                                key={i} 
                                className="w-1.5 bg-white rounded-full animate-bounce"
                                style={{ 
                                height: `${Math.random() * 40 + 10}px`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '0.6s'
                                }}
                            />
                            ))
                        ) : (
                            <div className="h-1 w-24 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-600 animate-progress origin-left w-full"></div>
                            </div>
                        )}
                      </div>
                  </div>
              </div>

              {/* Controls */}
              <div className="p-8 pb-12 flex justify-center items-center gap-6">
                  <button className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors">
                      <MicOff size={24} />
                  </button>
                  <button 
                    onClick={endAiConsultation}
                    className="p-6 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
                  >
                      <Phone size={32} className="rotate-[135deg]" />
                  </button>
                  <button className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors">
                      <Mic size={24} />
                  </button>
              </div>
          </div>
      )}

      {/* Floating Action Button (Back to Master View) - Only in Preview */}
      {isPreview && (
        <button 
            onClick={() => onNavigate(AppView.DASHBOARD)}
            className="absolute top-28 -left-3 bg-zinc-800 text-white p-2 pl-4 rounded-r-lg shadow-xl text-xs flex items-center gap-1 hover:bg-zinc-700 transition-transform hover:translate-x-1 border border-zinc-700 z-50"
        >
            <ArrowLeft size={12}/> Майстер
        </button>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-serif text-white mb-2 text-center">Скасувати запис?</h3>
                  <p className="text-zinc-400 mb-6 text-center text-sm">
                      Ви впевнені, що хочете скасувати цей візит? Ця дія незворотна.
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setShowCancelModal(null)}
                        className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                      >
                          Назад
                      </button>
                      <button 
                        onClick={confirmCancel}
                        className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                      >
                          Так, скасувати
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                  <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                      <h3 className="text-white font-serif text-lg flex items-center gap-2">
                          <Lock size={16} className="text-emerald-500" />
                          Оплата Карткою
                      </h3>
                      <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-5">
                      <div className="text-center mb-6">
                          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">До сплати</p>
                          <div className="text-3xl font-bold text-white">
                              ₴{totalPrice}
                          </div>
                          {selectedDates.length > 1 && (
                            <p className="text-zinc-500 text-xs mt-1">{selectedDates.length} запис(и)</p>
                          )}
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Номер Картки</label>
                              <div className="relative">
                                  <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                  <input 
                                    type="text" 
                                    placeholder="0000 0000 0000 0000"
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                    className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-10 text-white placeholder-zinc-700 focus:ring-1 focus:ring-soul-500 focus:outline-none text-sm tracking-widest font-mono"
                                    maxLength={19}
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Термін</label>
                                  <input 
                                    type="text" 
                                    placeholder="MM/YY"
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(e.target.value)}
                                    className="w-full bg-black border border-zinc-700 rounded-xl py-3 px-4 text-white placeholder-zinc-700 focus:ring-1 focus:ring-soul-500 focus:outline-none text-sm text-center font-mono"
                                    maxLength={5}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-zinc-400 font-medium mb-1.5 block">CVV</label>
                                  <input 
                                    type="password" 
                                    placeholder="123"
                                    value={cardCvv}
                                    onChange={(e) => setCardCvv(e.target.value)}
                                    className="w-full bg-black border border-zinc-700 rounded-xl py-3 px-4 text-white placeholder-zinc-700 focus:ring-1 focus:ring-soul-500 focus:outline-none text-sm text-center font-mono"
                                    maxLength={3}
                                  />
                              </div>
                          </div>
                      </div>
                      <button 
                          onClick={processPayment}
                          disabled={isProcessingPayment || !cardNumber || !cardExpiry || !cardCvv}
                          className="w-full bg-soul-600 hover:bg-soul-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-soul-900/20 transition-all mt-4 flex items-center justify-center gap-2"
                      >
                          {isProcessingPayment ? <Loader2 size={18} className="animate-spin" /> : <>Оплатити ₴{totalPrice}</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full text-center shadow-2xl animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-serif text-white mb-2">
                    {totalPrice === 0 ? 'Безкоштовний Запис!' : (paymentMethod === 'card' ? 'Оплачено та Записано!' : 'Успішно!')}
                </h3>
                <p className="text-zinc-400 mb-6">Ваш запис на {selectedDates.join(', ')} о {selectedTime} підтверджено.</p>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[progress_2.5s_ease-in-out_forwards] w-full origin-left"></div>
                </div>
            </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur border-t border-zinc-900 p-4 pb-8">
           <div className="flex justify-around items-center">
               <button 
                onClick={() => {
                    if(isTelegram) tg?.HapticFeedback.selectionChanged();
                    setActiveTab('home');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-soul-500' : 'text-zinc-600 hover:text-zinc-400'}`}
               >
                   <User size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Головна</span>
               </button>
               <button 
                onClick={() => {
                    if(isTelegram) tg?.HapticFeedback.selectionChanged();
                    setActiveTab('booking');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'booking' ? 'text-soul-500' : 'text-zinc-600 hover:text-zinc-400'}`}
               >
                   <Calendar size={22} strokeWidth={activeTab === 'booking' ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Запис</span>
               </button>
               <button 
                onClick={() => {
                    if(isTelegram) tg?.HapticFeedback.selectionChanged();
                    setActiveTab('loyalty');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'loyalty' ? 'text-soul-500' : 'text-zinc-600 hover:text-zinc-400'}`}
               >
                   <Star size={22} strokeWidth={activeTab === 'loyalty' ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Лояльність</span>
               </button>
           </div>
      </div>
    </div>
  );
};

export default ClientHome;
