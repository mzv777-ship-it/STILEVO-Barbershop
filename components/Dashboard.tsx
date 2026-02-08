
import React, { useState, useEffect } from 'react';
import { Client, AppView, Appointment, AdminReminder } from '../types';
import { TrendingDown, TrendingUp, AlertCircle, Calendar as CalendarIcon, MessageCircle, ChevronRight, Wallet, Clock, CheckCircle2, Gift, BellRing, PhoneIncoming, User, Scissors, MapPin, Bell, BarChart3, Bot, QrCode, X } from 'lucide-react';

interface DashboardProps {
  clients: Client[];
  appointments: Appointment[];
  adminReminders?: AdminReminder[];
  onSelectClient: (client: Client) => void;
  onNavigate: (view: AppView) => void;
  onToggleReminder: (appointmentId: string) => void;
}

const SCHEDULE_TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const DATES = ['Сьогодні', 'Завтра', 'Пн', 'Вт', 'Ср', 'Чт'];

const Dashboard: React.FC<DashboardProps> = ({ clients, appointments, adminReminders = [], onSelectClient, onNavigate, onToggleReminder }) => {
  const [selectedDate, setSelectedDate] = useState('Сьогодні');
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Calculate current time line position
  useEffect(() => {
    const updatePosition = () => {
        const now = new Date();
        const startHour = 10;
        const endHour = 18;
        const currentHour = now.getHours() + now.getMinutes() / 60;
        
        if (currentHour >= startHour && currentHour <= endHour) {
            const percentage = ((currentHour - startHour) / (endHour - startHour)) * 100;
            setCurrentTimePosition(percentage);
        } else {
            setCurrentTimePosition(-1); // Hide if out of hours
        }
    };
    updatePosition();
    const interval = setInterval(updatePosition, 60000);
    return () => clearInterval(interval);
  }, []);

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const filteredAppointments = appointments.filter(a => a.date === selectedDate);

  const getReminderTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours - 3, minutes);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleToggleReminderWithFeedback = (e: React.MouseEvent, appt: Appointment) => {
      e.stopPropagation();
      onToggleReminder(appt.id);
      
      if (!appt.reminderSet) {
          const reminderTime = getReminderTime(appt.time);
          setReminderToast(`Нагадування в Telegram заплановано на ${reminderTime} (за 3 години)`);
          setTimeout(() => setReminderToast(null), 3000);
      } else {
          setReminderToast("Нагадування скасовано");
          setTimeout(() => setReminderToast(null), 2000);
      }
  };

  const baseUrl = window.location.origin + window.location.pathname;
  const clientLink = `${baseUrl}?role=client`;
  const masterLink = `${baseUrl}`; // Default to selection/master

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-6 relative">
      
      {/* Toast Notification */}
      {reminderToast && (
          <div className="fixed top-24 right-6 z-50 bg-zinc-800 border border-soul-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right fade-in">
              <div className="bg-soul-500/20 p-2 rounded-full text-soul-400">
                  <BellRing size={18} />
              </div>
              <div>
                  <div className="font-medium text-sm">Оновлено</div>
                  <div className="text-xs text-zinc-400">{reminderToast}</div>
              </div>
          </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-6 py-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-white">Панель Майстра</h1>
          <p className="text-zinc-400 text-sm">Розклад та аналітика. Сьогодні: {appointments.filter(a => a.date === 'Сьогодні').length} записів.</p>
        </div>
        
        {/* Navigation Links */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide items-center">
             <button 
                onClick={() => onNavigate(AppView.FINANCE)} 
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
                 <Wallet size={16} /> Фінанси
             </button>
             <button 
                onClick={() => onNavigate(AppView.ANALYTICS)} 
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
                 <BarChart3 size={16} /> Аналітика
             </button>
             <button 
                onClick={() => onNavigate(AppView.SESSION)} 
                className="bg-soul-600 border border-soul-500 hover:bg-soul-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-soul-900/20 whitespace-nowrap"
            >
                 <Bot size={16} /> AI Асистент
             </button>
             <button 
                onClick={() => setShowQrModal(true)} 
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white p-2 rounded-lg transition-colors ml-2"
                title="Отримати QR коди доступу"
            >
                 <QrCode size={18} />
             </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-900/30 text-red-400 rounded-lg">
                <TrendingDown size={20} />
                </div>
                <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Ризик Відтоку</h3>
            </div>
            <p className="text-3xl font-semibold text-white">12%</p>
            <p className="text-sm text-zinc-500 mt-1">Прогнозована втрата доходу: ₴18,500</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-900/30 text-emerald-400 rounded-lg">
                <TrendingUp size={20} />
                </div>
                <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Утримання</h3>
            </div>
            <p className="text-3xl font-semibold text-white">88%</p>
            <p className="text-sm text-zinc-500 mt-1">+2% з минулого місяця</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-900/30 text-indigo-400 rounded-lg">
                <MessageCircle size={20} />
                </div>
                <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Очікувані Листи</h3>
            </div>
            <p className="text-3xl font-semibold text-white">4</p>
            <p className="text-sm text-zinc-500 mt-1">Створити повідомлення після візиту</p>
            </div>
        </div>

        {/* AI Requests Section */}
        {adminReminders.length > 0 && (
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-900 border border-zinc-800 border-l-4 border-l-soul-500 p-6 rounded-2xl animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-soul-500/10 text-soul-500 rounded-lg animate-pulse">
                        <PhoneIncoming size={20} />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Вхідні запити від ШІ-Адміністратора</h2>
                    <span className="bg-soul-600 text-white text-xs px-2 py-0.5 rounded-full">{adminReminders.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminReminders.map(reminder => (
                        <div key={reminder.id} className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-soul-500/30 transition-colors">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-white">{reminder.clientName}</span>
                                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{reminder.clientPhone}</span>
                                </div>
                                <div className="text-sm text-zinc-300">
                                    Хоче: <span className="text-soul-300">{reminder.service}</span> на {reminder.requestedDate} о {reminder.requestedTime}
                                </div>
                                <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                                    <BellRing size={10} /> Нагадування в Telegram: {new Date(reminder.telegramReminderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" title="Підтвердити">
                                    <CheckCircle2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* CALENDAR / TIMETABLE SECTION (Altegio Style) */}
            <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[700px]">
                {/* Calendar Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                    <div className="flex items-center gap-2">
                        <CalendarIcon size={20} className="text-soul-500" />
                        <h2 className="text-lg font-semibold text-white">Розклад</h2>
                    </div>
                    {/* Date Tabs */}
                    <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                        {DATES.map(date => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${selectedDate === date ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {date}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto relative bg-zinc-900 p-4 custom-scrollbar">
                    <div className="relative min-h-[600px]">
                        {/* Time Lines */}
                        {SCHEDULE_TIMES.map((time, index) => (
                            <div key={time} className="flex items-center relative h-[80px]" style={{ top: 0 }}>
                                <div className="w-16 text-right pr-4 text-xs font-medium text-zinc-500 -mt-[70px]">{time}</div>
                                <div className="flex-1 border-t border-zinc-800/50 h-full w-full absolute left-16 top-0"></div>
                            </div>
                        ))}
                        
                        {/* Current Time Indicator (Red Line) */}
                        {selectedDate === 'Сьогодні' && currentTimePosition >= 0 && (
                            <div 
                                className="absolute left-16 right-0 border-t-2 border-red-500 z-20 flex items-center"
                                style={{ top: `${(currentTimePosition / 100) * (SCHEDULE_TIMES.length - 1) * 80}px` }}
                            >
                                <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                                <span className="text-[10px] text-red-500 bg-zinc-950 px-1 ml-1 rounded">Зараз</span>
                            </div>
                        )}

                        {/* Appointment Blocks */}
                        {filteredAppointments.map((appt) => {
                            const timeIndex = SCHEDULE_TIMES.indexOf(appt.time);
                            if (timeIndex === -1) return null;
                            
                            // Determine height based on duration (mock logic: default 1 hour)
                            const durationHours = 1; 
                            const topPosition = timeIndex * 80;
                            const height = durationHours * 80 - 4; // -4 for gap

                            const client = getClientById(appt.clientId);

                            return (
                                <div 
                                    key={appt.id}
                                    onClick={() => client && onSelectClient(client)}
                                    className={`absolute left-20 right-4 rounded-lg p-3 border-l-4 cursor-pointer hover:brightness-110 transition-all shadow-lg group z-10 flex gap-4 overflow-hidden
                                        ${appt.isFree 
                                            ? 'bg-emerald-900/40 border-emerald-500' 
                                            : 'bg-soul-900/40 border-soul-500'
                                        }
                                    `}
                                    style={{ top: `${topPosition}px`, height: `${height}px` }}
                                >
                                    <div className="shrink-0">
                                        <img src={appt.avatarUrl} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-white font-semibold text-sm truncate group-hover:underline">{appt.clientName}</h4>
                                                <span className="text-xs font-mono font-medium text-white/80 bg-black/30 px-1.5 py-0.5 rounded">
                                                    {appt.time}
                                                </span>
                                            </div>
                                            <div className="text-zinc-300 text-xs truncate mt-0.5 flex items-center gap-1.5">
                                                <Scissors size={10} /> {appt.serviceName}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold ${appt.isFree ? 'text-emerald-400' : 'text-soul-300'}`}>
                                                    {appt.isFree ? 'FREE' : `₴${appt.price}`}
                                                </span>
                                                {appt.status === 'confirmed' && (
                                                    <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-black/20 px-1.5 rounded">
                                                        <CheckCircle2 size={10} /> Confirmed
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Master Reminder Toggle */}
                                            <button 
                                                onClick={(e) => handleToggleReminderWithFeedback(e, appt)}
                                                className={`p-1.5 rounded-full transition-colors z-20 ${appt.reminderSet ? 'bg-soul-500 text-white shadow-lg shadow-soul-500/40' : 'bg-black/20 text-zinc-400 hover:text-white hover:bg-black/40'}`}
                                                title={appt.reminderSet ? "Нагадування ввімкнено" : "Створити нагадування для майстра"}
                                            >
                                                <Bell size={12} fill={appt.reminderSet ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State message if no appts */}
                        {filteredAppointments.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 md:opacity-100">
                                <div className="text-center text-zinc-600">
                                    <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Немає записів на цей день</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Client Focus List (Right Sidebar) */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Фокус на Клієнтах</h2>
                <div className="grid gap-4 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
                {clients.map(client => (
                    <div 
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="group bg-zinc-900/50 border border-zinc-800 hover:border-soul-500/50 hover:bg-zinc-900 p-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between"
                    >
                    <div className="flex items-center gap-4">
                        <img src={client.avatarUrl} alt={client.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-soul-500 transition-all" />
                        <div>
                        <h3 className="text-white font-medium text-lg">{client.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <CalendarIcon size={14} />
                            <span>Останній візит: {new Date(client.lastVisit).toLocaleDateString()}</span>
                        </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                        <div className="text-xs text-zinc-500 uppercase">Ймовірність відтоку</div>
                        <div className={`font-semibold ${
                            client.churnProbability > 70 ? 'text-red-400' : 
                            client.churnProbability > 40 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                            {client.churnProbability}%
                        </div>
                        </div>
                        
                        {client.status === 'risk' && (
                        <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-medium border border-red-500/20 flex items-center gap-1">
                            <AlertCircle size={12} /> Ризик
                        </div>
                        )}
                        
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-soul-600 group-hover:text-white transition-colors">
                        <ChevronRight size={16}/>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-full max-w-2xl shadow-2xl relative">
                  <button 
                    onClick={() => setShowQrModal(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                  >
                      <X size={24} />
                  </button>
                  
                  <h2 className="text-2xl font-serif text-white mb-8 text-center">Точки Входу (QR)</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Client QR */}
                      <div className="flex flex-col items-center p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 hover:border-indigo-500/50 transition-colors group">
                          <h3 className="text-lg font-medium text-white mb-2">Для Клієнтів</h3>
                          <p className="text-xs text-zinc-500 mb-4 text-center">Відкриває лише застосунок запису. Сховати панель майстра.</p>
                          <div className="bg-white p-2 rounded-lg mb-4 group-hover:scale-105 transition-transform">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clientLink)}`} 
                                alt="Client QR"
                                className="w-40 h-40"
                              />
                          </div>
                          <a href={clientLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline break-all text-center max-w-full">
                              {clientLink}
                          </a>
                      </div>

                      {/* Master QR */}
                      <div className="flex flex-col items-center p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 hover:border-soul-500/50 transition-colors group">
                          <h3 className="text-lg font-medium text-white mb-2">Для Майстра</h3>
                          <p className="text-xs text-zinc-500 mb-4 text-center">Повний доступ: Панель майстра + Тест клієнтського застосунку.</p>
                          <div className="bg-white p-2 rounded-lg mb-4 group-hover:scale-105 transition-transform">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(masterLink)}`} 
                                alt="Master QR"
                                className="w-40 h-40"
                              />
                          </div>
                          <a href={masterLink} target="_blank" rel="noopener noreferrer" className="text-xs text-soul-400 hover:underline break-all text-center max-w-full">
                              {masterLink}
                          </a>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
