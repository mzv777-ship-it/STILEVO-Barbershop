
import React, { useState, useEffect } from 'react';
import { AppView, Client, Transaction, Appointment, AdminReminder, Review } from './types';
import Dashboard from './components/Dashboard';
import Session from './components/Session';
import ClientProfile from './components/ClientProfile';
import Finance from './components/Finance';
import Analytics from './components/Analytics';
import ClientHome from './components/ClientHome';
import { LayoutDashboard, Wallet, User, Scissors, Smartphone, Briefcase, ArrowRight, Calendar, Bot, LogOut, Menu, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from './lib/supabase';

// Mock Data
const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Олена Ростова',
    avatarUrl: 'https://picsum.photos/200/200?random=1',
    lastVisit: '2023-10-15',
    frequency: 6,
    churnProbability: 85,
    notes: 'Згадувала про переїзд у нову квартиру подалі. Здавалася розгубленою.',
    status: 'risk',
    phone: '+15550109988',
    telegram: 'elenar_style',
    whatsapp: '+15550109988',
    visitsCount: 12,
    reviews: []
  },
  {
    id: '2',
    name: 'Сара Чен',
    avatarUrl: 'https://picsum.photos/200/200?random=2',
    lastVisit: '2023-11-01',
    frequency: 4,
    churnProbability: 12,
    notes: 'Подобається новий боб-каре. Питала про фарбування на наступний раз.',
    status: 'active',
    phone: '+15550123456',
    whatsapp: '+15550123456',
    visitsCount: 5, // Next visit should be free (6th)
    reviews: []
  },
  {
    id: '3',
    name: 'Маркус Торн',
    avatarUrl: 'https://picsum.photos/200/200?random=3',
    lastVisit: '2023-09-20',
    frequency: 8,
    churnProbability: 45,
    notes: 'Пропустив останній запис через відрядження.',
    status: 'active',
    telegram: 'marcus_t',
    visitsCount: 3,
    reviews: []
  },
  {
      id: '4',
      name: 'Новий Клієнт',
      avatarUrl: '',
      lastVisit: '',
      frequency: 0,
      churnProbability: 0,
      notes: '',
      status: 'active',
      visitsCount: 0,
      reviews: []
  }
];

// Generates transactions over the last 5 months for realistic analytics
const generateHistoricalTransactions = (): Transaction[] => {
    const today = new Date();
    const transactions: Transaction[] = [];
    
    // Helper to add days
    const subDays = (d: Date, days: number) => new Date(d.getTime() - days * 86400000);
    // Helper to sub months (roughly)
    const subMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() - months, 15);

    // Recent (This Month)
    transactions.push(
        { id: '1', amount: 850, date: subDays(today, 2).toISOString(), type: 'income', category: 'Service', description: 'Стрижка + Борода', clientName: 'Маркус Торн' },
        { id: '3', amount: 1200, date: today.toISOString(), type: 'income', category: 'Service', description: 'Фарбування', clientName: 'Сара Чен' },
        { id: '4', amount: 450, date: subDays(today, 1).toISOString(), type: 'expense', category: 'Supplies', description: 'Закупка косметики' },
        { id: '5', amount: 3200, date: subDays(today, 5).toISOString(), type: 'expense', category: 'Rent', description: 'Оренда крісла (тиждень)' }
    );

    // Last Month
    const lastMonth = subMonths(today, 1);
    transactions.push(
        { id: '6', amount: 15000, date: lastMonth.toISOString(), type: 'income', category: 'Service', description: 'Сукупний дохід за послуги' },
        { id: '7', amount: 8000, date: subDays(lastMonth, 2).toISOString(), type: 'expense', category: 'Rent', description: 'Оренда приміщення' },
        { id: '8', amount: 2000, date: subDays(lastMonth, 5).toISOString(), type: 'expense', category: 'Supplies', description: 'Матеріали' }
    );

    // 2 Months Ago
    const month2 = subMonths(today, 2);
    transactions.push(
        { id: '9', amount: 12500, date: month2.toISOString(), type: 'income', category: 'Service', description: 'Сукупний дохід' },
        { id: '10', amount: 8000, date: subDays(month2, 1).toISOString(), type: 'expense', category: 'Rent', description: 'Оренда' }
    );

    // 3 Months Ago
    const month3 = subMonths(today, 3);
    transactions.push(
        { id: '11', amount: 18000, date: month3.toISOString(), type: 'income', category: 'Service', description: 'Сукупний дохід (Свята)' },
        { id: '12', amount: 8000, date: subDays(month3, 3).toISOString(), type: 'expense', category: 'Rent', description: 'Оренда' },
        { id: '13', amount: 3000, date: subDays(month3, 10).toISOString(), type: 'expense', category: 'Marketing', description: 'Реклама Instagram' }
    );

     // 4 Months Ago
     const month4 = subMonths(today, 4);
     transactions.push(
         { id: '14', amount: 11000, date: month4.toISOString(), type: 'income', category: 'Service', description: 'Сукупний дохід' },
         { id: '15', amount: 8000, date: subDays(month4, 3).toISOString(), type: 'expense', category: 'Rent', description: 'Оренда' }
     );

    return transactions;
};

const INITIAL_TRANSACTIONS: Transaction[] = generateHistoricalTransactions();

type AuthMode = 'selection' | 'master' | 'client';

// Helper to convert DB timestamp to App Date format (Сьогодні, Завтра, etc.)
const mapDbDateToAppDate = (isoString: string): string => {
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getDate() === d2.getDate() && 
        d1.getMonth() === d2.getMonth() && 
        d1.getFullYear() === d2.getFullYear();

    if (isSameDay(date, today)) return 'Сьогодні';
    if (isSameDay(date, tomorrow)) return 'Завтра';

    const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[date.getDay()];
};

// Helper to get time string from ISO
const mapDbDateToTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
};

const App: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('selection');
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [adminReminders, setAdminReminders] = useState<AdminReminder[]>([]);
  
  // Track which client is logged in the Client App
  const [clientAppUserId, setClientAppUserId] = useState<string>('4'); // Default to 'New Client'

  // Fetch appointments from Supabase on mount
  useEffect(() => {
      fetchAppointments();
      
      const subscription = supabase
          .channel('appointments_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
              fetchAppointments();
          })
          .subscribe();

      // Check URL params for role
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'client') {
          // If accessing via Client QR Code, bypass selection
          setClientAppUserId('4'); // Default new client (or handle via telegram)
          setAuthMode('client');
      }

      return () => {
          subscription.unsubscribe();
      };
  }, []);

  const fetchAppointments = async () => {
      const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('visit_time', { ascending: true });

      if (error) {
          console.error('Error fetching appointments:', error);
          return;
      }

      if (data) {
          const mappedAppointments: Appointment[] = data.map((row: any) => ({
              id: row.id.toString(),
              clientId: 'unknown', // DB doesn't have this, simplified
              clientName: row.client_name || 'Гість',
              avatarUrl: `https://ui-avatars.com/api/?name=${row.client_name || 'Guest'}&background=random`,
              serviceName: row.service,
              date: mapDbDateToAppDate(row.visit_time),
              time: mapDbDateToTime(row.visit_time),
              price: row.service?.includes('+') ? 800 : (row.service?.includes('Моделювання') ? 400 : 600), // Infer price
              status: 'confirmed',
              createdAt: row.created_at || new Date().toISOString(),
              reminderSet: false,
              isFree: false
          }));
          setAppointments(mappedAppointments);
      }
  };

  // Initialize Telegram Web App & Auto Login
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      const user = tg.initDataUnsafe?.user;
      
      if (user) {
        // --- TELEGRAM AUTO-LOGIN LOGIC ---
        
        // 1. Check if user already exists in our "database" (mock data)
        const existingClient = clients.find(c => c.telegram === user.username || c.id === user.id.toString());
        
        if (existingClient) {
            setClientAppUserId(existingClient.id);
        } else {
            // 2. If new user, create a new client profile dynamically
            const newId = user.id.toString();
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
            
            const newClient: Client = {
                id: newId,
                name: fullName || 'Гість',
                avatarUrl: `https://ui-avatars.com/api/?name=${fullName}&background=d946ef&color=fff`,
                lastVisit: new Date().toISOString(),
                frequency: 0,
                churnProbability: 0,
                notes: 'Приєднався через Telegram Mini App',
                status: 'active',
                phone: '', // Will be asked later
                telegram: user.username,
                visitsCount: 0,
                reviews: []
            };
            
            setClients(prev => {
                 // Prevent duplicates if strict mode triggers twice
                 if (prev.some(c => c.id === newId)) return prev;
                 return [...prev, newClient];
            });
            setClientAppUserId(newId);
        }
        
        // 3. Force mode to Client App
        setAuthMode('client');
      }
    }
  }, []);

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCurrentView(AppView.CLIENT_PROFILE);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...transaction,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setTransactions(prev => [...prev, newTx]);
  };

  const handleAddReminder = (reminder: Omit<AdminReminder, 'id' | 'status' | 'createdAt'>) => {
      const newReminder: AdminReminder = {
          ...reminder,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          status: 'new',
          createdAt: new Date().toISOString()
      };
      setAdminReminders(prev => [newReminder, ...prev]);
  };

  const handleAddReview = (review: Review) => {
      setClients(prev => prev.map(c => {
          if (c.id === review.clientId) {
              return {
                  ...c,
                  reviews: [review, ...(c.reviews || [])]
              };
          }
          return c;
      }));
  };

  const handleToggleReminder = (appointmentId: string) => {
      setAppointments(prev => prev.map(appt => 
          appt.id === appointmentId ? { ...appt, reminderSet: !appt.reminderSet } : appt
      ));
  };

  const handleCancelAppointment = async (appointmentId: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) {
          console.error("Failed to delete appointment", error);
          return;
      }
      setAppointments(prev => prev.filter(appt => appt.id !== appointmentId));
  };

  const handleBookAppointment = async (bookingData: { 
      serviceName: string; 
      date: string; 
      time: string; 
      price: number; 
      clientName: string;
      clientPhone: string;
      paymentMethod: 'card' | 'cash';
      targetClientId?: string;
  }) => {
      // Find the current client in the client app
      // Use targetClientId if provided (for Preview Mode), otherwise use logged in state
      const effectiveClientId = bookingData.targetClientId || clientAppUserId;
      
      const clientIndex = clients.findIndex(c => c.id === effectiveClientId);
      if (clientIndex === -1) return;
      
      const currentUser = clients[clientIndex]; 
      
      // LOYALTY LOGIC: Every 6th visit is free.
      const nextVisitCount = currentUser.visitsCount + 1;
      const isFreeVisit = nextVisitCount % 6 === 0;

      // Construct DB visit_time
      // Note: "Сьогодні" / "Завтра" handling
      const now = new Date();
      let targetDate = new Date();
      if (bookingData.date === 'Сьогодні') {
          // keep today
      } else if (bookingData.date === 'Завтра') {
          targetDate.setDate(targetDate.getDate() + 1);
      } else {
          // Handle specific weekday names if needed, or assume today for safety in this demo logic if matching fails
          // For a real production app we'd parse the specific date string
          const daysMap: Record<string, number> = { 'Нд': 0, 'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6 };
          const targetDay = daysMap[bookingData.date];
          if (targetDay !== undefined) {
             const currentDay = now.getDay();
             let diff = targetDay - currentDay;
             if (diff <= 0) diff += 7;
             targetDate.setDate(now.getDate() + diff);
          }
      }

      // Set Time
      const [hours, minutes] = bookingData.time.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);
      
      const visitTimeISO = targetDate.toISOString();

      // INSERT INTO SUPABASE
      const { data, error } = await supabase
          .from('appointments')
          .insert([
              {
                  client_name: bookingData.clientName || currentUser.name,
                  phone: bookingData.clientPhone || currentUser.phone,
                  service: bookingData.serviceName,
                  visit_time: visitTimeISO
              }
          ])
          .select();

      if (error) {
          console.error("Supabase insert error:", error);
          return;
      }

      // Update local state is handled by the subscription or manual refetch
      // But we update client stats locally immediately
      let updatedClient = { ...currentUser, visitsCount: nextVisitCount };
      if (currentUser.visitsCount === 0) {
          updatedClient.name = bookingData.clientName || currentUser.name;
          updatedClient.phone = bookingData.clientPhone || currentUser.phone;
          // Assign a random avatar for the new user if they don't have one or used UI avatars
          if (!updatedClient.avatarUrl || updatedClient.avatarUrl.includes('ui-avatars')) {
              updatedClient.avatarUrl = `https://picsum.photos/200/200?random=${Date.now()}`;
          }
      }

      // Update Client State
      setClients(prev => {
          const newClients = [...prev];
          newClients[clientIndex] = updatedClient;
          return newClients;
      });

      // Transaction Logic: 
      // Only log 'free' loyalty visits here. 
      // 'Card' payments are handled by ClientHome to consolidate multiple dates into one transaction.
      if (isFreeVisit) {
          handleAddTransaction({
              amount: 0,
              date: new Date().toISOString(),
              type: 'income',
              category: 'Service',
              description: `Loyalty Free: ${bookingData.serviceName}`,
              clientName: bookingData.clientName,
              clientId: currentUser.id,
              method: 'free'
          });
      }
      
      // Refresh list
      fetchAppointments();
  };

  // --- Login / Selection Screen ---
  if (authMode === 'selection') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-soul-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px]"></div>
        
        <div className="z-10 w-full max-w-4xl">
           <div className="text-center mb-16 space-y-4">
             <div className="w-16 h-16 bg-gradient-to-tr from-soul-600 to-indigo-600 rounded-2xl flex items-center justify-center font-serif font-bold text-white text-4xl mx-auto shadow-2xl shadow-soul-900/30">
               S
             </div>
             <h1 className="text-5xl font-serif text-white tracking-tight">STILEVO</h1>
             <p className="text-zinc-400 text-lg max-w-md mx-auto">
               Оберіть роль для входу в екосистему
             </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Master Card */}
             <button 
               onClick={() => setAuthMode('master')}
               className="group relative bg-zinc-900 border border-zinc-800 hover:border-soul-500/50 p-8 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-soul-900/20 hover:-translate-y-1"
             >
               <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:bg-soul-600 transition-colors">
                  <Briefcase size={24} />
               </div>
               <h2 className="text-2xl font-serif text-white mb-2 group-hover:text-soul-300 transition-colors">Панель Майстра</h2>
               <p className="text-zinc-500 mb-8 leading-relaxed">
                 Повний доступ до аналітики, фінансів, бази клієнтів та Live AI асистента.
               </p>
               <div className="flex items-center text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">
                 Увійти як Майстер <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
               </div>
             </button>

             {/* Client Card */}
             <button 
               onClick={() => {
                   setClientAppUserId('4'); // Default to new client
                   setAuthMode('client');
               }}
               className="group relative bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 p-8 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-900/20 hover:-translate-y-1"
             >
               <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:bg-indigo-600 transition-colors">
                  <Smartphone size={24} />
               </div>
               <h2 className="text-2xl font-serif text-white mb-2 group-hover:text-indigo-300 transition-colors">Застосунок Клієнта</h2>
               <p className="text-zinc-500 mb-8 leading-relaxed">
                 Telegram Mini App інтерфейс для запису та програми лояльності.
               </p>
               <div className="flex items-center text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">
                 Увійти як Клієнт <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
               </div>
             </button>
           </div>
           
           <div className="mt-8 flex justify-center gap-4">
               <button onClick={() => { setClientAppUserId('2'); setAuthMode('client'); }} className="text-xs text-zinc-600 hover:text-soul-500 underline">
                   Демо: Сара (5 візитів, наступний безкоштовно)
               </button>
               <button onClick={() => { setClientAppUserId('4'); setAuthMode('client'); }} className="text-xs text-zinc-600 hover:text-indigo-500 underline">
                   Демо: Новий Клієнт (0 візитів)
               </button>
           </div>
        </div>

        <div className="absolute bottom-6 text-zinc-600 text-xs uppercase tracking-widest">
           v2.0.4 • AI Powered Workspace
        </div>
      </div>
    );
  }

  // --- Client View Mode (Real Client) ---
  if (authMode === 'client') {
      const clientViewUser = clients.find(c => c.id === clientAppUserId) || clients[0];
      const clientAppointments = appointments.filter(a => a.clientId === clientViewUser.id);
      const isDirectClientLink = new URLSearchParams(window.location.search).get('role') === 'client';

    return (
      <div className="bg-zinc-950 min-h-screen">
         <ClientHome 
            client={clientViewUser} 
            appointments={clientAppointments}
            onNavigate={() => {}} // Client nav is self-contained or disabled in this demo
            isPreview={false}
            onBookAppointment={handleBookAppointment}
            onCancelAppointment={handleCancelAppointment}
            onAddReminder={handleAddReminder}
            onAddTransaction={handleAddTransaction}
            onAddReview={handleAddReview}
         />
         {/* Floating Logout for Demo purposes (Only show if NOT in Telegram and NOT using direct client link to avoid clutter) */}
         {!window.Telegram?.WebApp?.initData && !isDirectClientLink && (
             <button 
             onClick={() => setAuthMode('selection')}
             className="fixed top-6 right-6 z-50 bg-black/50 backdrop-blur text-zinc-500 hover:text-white p-2 rounded-full text-xs border border-zinc-800"
             >
             Вийти
             </button>
         )}
      </div>
    );
  }

  // --- MASTER VIEW COMPONENT RENDERER ---
  const renderMasterContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
          <Dashboard 
            clients={clients} 
            appointments={appointments}
            adminReminders={adminReminders}
            onSelectClient={handleSelectClient}
            onNavigate={handleNavigate}
            onToggleReminder={handleToggleReminder}
          />
        );
      case AppView.FINANCE:
        return (
          <Finance 
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onNavigate={handleNavigate}
          />
        );
      case AppView.ANALYTICS:
        return (
          <Analytics
             transactions={transactions}
             onNavigate={handleNavigate}
          />
        );
      case AppView.SESSION:
        return (
          <Session 
            activeClient={selectedClient} 
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onAddTransaction={handleAddTransaction}
          />
        );
      case AppView.CLIENT_PROFILE:
        return selectedClient ? (
          <ClientProfile 
            client={selectedClient} 
            transactions={transactions}
            onBack={() => {
              setSelectedClient(null);
              setCurrentView(AppView.DASHBOARD);
            }} 
            onUpdate={handleUpdateClient}
            onAddTransaction={handleAddTransaction}
          />
        ) : <Dashboard clients={clients} appointments={appointments} adminReminders={adminReminders} onSelectClient={handleSelectClient} onNavigate={handleNavigate} onToggleReminder={handleToggleReminder}/>;
      case AppView.CLIENT_HOME:
        // Use selected client, or default to first client (Elena) for better demo visualization than "New Client"
        const previewUser = selectedClient || clients[0];
        const previewAppointments = appointments.filter(a => a.clientId === previewUser.id);
        
        return (
            <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8 bg-zinc-900/30">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-serif text-white flex items-center justify-center gap-2">
                         <Smartphone size={24} className="text-soul-500" />
                         Симулятор Telegram Mini App
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1 max-w-md">
                        Перегляд інтерфейсу очима клієнта <span className="text-soul-300 font-medium">{previewUser.name}</span>.
                        Ви можете тестувати запис, оплату та скасування.
                    </p>
                </div>

                {/* Phone Frame - Replaced 'mockup-phone' with purely custom utility classes for safety */}
                <div className="relative border-zinc-800 bg-zinc-950 rounded-[2.5rem] border-[8px] shadow-2xl h-[700px] w-[375px] overflow-hidden flex flex-col box-border">
                     {/* Dynamic Island / Notch */}
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-50 flex items-center justify-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-black/50"></div>
                         <div className="w-8 h-1.5 rounded-full bg-black/50"></div>
                     </div>
                     
                     {/* Screen Content */}
                     <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 pt-6">
                        <ClientHome 
                            client={previewUser} 
                            appointments={previewAppointments}
                            onNavigate={handleNavigate}
                            isPreview={true}
                            onBookAppointment={handleBookAppointment}
                            onCancelAppointment={handleCancelAppointment}
                            onAddReminder={handleAddReminder}
                            onAddTransaction={handleAddTransaction}
                            onAddReview={handleAddReview}
                        />
                     </div>
                     
                     {/* Home Indicator */}
                     <div className="h-1 bg-white/20 mx-auto w-1/3 rounded-full mb-2 mt-auto absolute bottom-2 left-1/2 -translate-x-1/2 z-50"></div>
                </div>
            </div>
        );
      default:
        return <Dashboard clients={clients} appointments={appointments} adminReminders={adminReminders} onSelectClient={handleSelectClient} onNavigate={handleNavigate} onToggleReminder={handleToggleReminder}/>;
    }
  };

  const menuItems = [
      { id: AppView.DASHBOARD, label: 'Календар', icon: Calendar },
      { id: AppView.FINANCE, label: 'Фінанси', icon: Wallet },
      { id: AppView.ANALYTICS, label: 'Аналітика', icon: BarChart3 },
      { id: AppView.SESSION, label: 'AI Асистент', icon: Bot },
      { id: AppView.CLIENT_HOME, label: 'App Клієнта', icon: Smartphone },
  ];

  // --- Master View Layout (Sidebar + Content) ---
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-soul-500 selection:text-white overflow-hidden">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-64 flex-col border-r border-zinc-900 bg-zinc-950/80 backdrop-blur">
            <div className="p-6">
                <div 
                    className="flex items-center gap-3 cursor-pointer group" 
                    onClick={() => setCurrentView(AppView.DASHBOARD)}
                >
                    <div className="w-10 h-10 bg-gradient-to-tr from-soul-600 to-indigo-600 rounded-xl flex items-center justify-center font-serif font-bold text-white text-xl shadow-lg shadow-soul-900/20 group-hover:scale-105 transition-transform">S</div>
                    <div>
                        <span className="font-serif text-lg tracking-tight font-semibold block leading-tight">STILEVO</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Master Panel</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                            ${currentView === item.id 
                                ? 'bg-zinc-900 text-white shadow-inner border border-zinc-800' 
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                            }
                        `}
                    >
                        <item.icon size={20} className={currentView === item.id ? 'text-soul-500' : 'text-zinc-500'} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-zinc-900">
                <button 
                    onClick={() => setAuthMode('selection')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={20} />
                    Вийти
                </button>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            
            {/* Mobile Header (Visible only on small screens) */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-soul-600 to-indigo-600 rounded-lg flex items-center justify-center font-serif font-bold text-white">S</div>
                    <span className="font-serif font-semibold">STILEVO</span>
                </div>
                <button onClick={() => setAuthMode('selection')} className="p-2 text-zinc-500">
                    <LogOut size={20} />
                </button>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
                {renderMasterContent()}
            </main>

            {/* MOBILE BOTTOM NAVIGATION */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-900 flex justify-around p-2 pb-6 z-50">
                {menuItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setCurrentView(item.id)} 
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] transition-colors ${currentView === item.id ? 'text-soul-500' : 'text-zinc-500'}`}
                    >
                        <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default App;
