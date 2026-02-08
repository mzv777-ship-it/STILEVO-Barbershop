
import React, { useState, useEffect } from 'react';
import { Client, FutureLetter, Transaction } from '../types';
import { ArrowLeft, Mail, Calendar, Clock, Star, Edit2, Save, X, Phone, Smartphone, Send, CreditCard, DollarSign, CheckCircle, Share2, MessageCircle, Wallet } from 'lucide-react';
import { generateFutureLetter } from '../services/geminiService';

interface ClientProfileProps {
  client: Client;
  transactions: Transaction[];
  onBack: () => void;
  onUpdate: (updatedClient: Client) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const ClientProfile: React.FC<ClientProfileProps> = ({ client, transactions, onBack, onUpdate, onAddTransaction }) => {
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Notes State
  const [notes, setNotes] = useState(client.notes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Contact State
  const [contactInfo, setContactInfo] = useState({
    phone: client.phone || '',
    telegram: client.telegram || '',
    whatsapp: client.whatsapp || ''
  });
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Filter transactions for this client
  const clientTransactions = transactions
    .filter(t => t.clientId === client.id || t.clientName === client.name)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Sync state with props when client changes or editing starts
  useEffect(() => {
    setContactInfo({
      phone: client.phone || '',
      telegram: client.telegram || '',
      whatsapp: client.whatsapp || ''
    });
    setNotes(client.notes);
  }, [client]);

  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const handleGenerateLetter = async () => {
    setIsGenerating(true);
    try {
      const letter = await generateFutureLetter(client.name, "Silent Authority", "Впевненість та Ясність");
      setGeneratedLetter(letter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    onUpdate({
      ...client,
      notes
    });
  };

  const handleCancelNotes = () => {
    setNotes(client.notes);
    setIsEditingNotes(false);
  };

  const handleSaveContact = () => {
    setIsEditingContact(false);
    onUpdate({
      ...client,
      phone: contactInfo.phone,
      telegram: contactInfo.telegram,
      whatsapp: contactInfo.whatsapp
    });
  };

  const handleCancelContact = () => {
    setContactInfo({
      phone: client.phone || '',
      telegram: client.telegram || '',
      whatsapp: client.whatsapp || ''
    });
    setIsEditingContact(false);
  };

  const handleProcessPayment = () => {
    if (!paymentAmount) return;
    setPaymentStatus('processing');
    
    // Simulate API call and save transaction
    setTimeout(() => {
        onAddTransaction({
            amount: parseFloat(paymentAmount),
            date: new Date().toISOString(),
            type: 'income',
            category: 'Service',
            clientName: client.name,
            clientId: client.id,
            description: 'Послуга клієнту',
            method: 'card'
        });

        setPaymentStatus('success');
        setTimeout(() => {
            setShowPayment(false);
            setPaymentStatus('idle');
            setPaymentAmount('');
        }, 2000);
    }, 1500);
  };

  const sendReminder = (platform: 'telegram' | 'whatsapp') => {
    const message = encodeURIComponent(`Привіт ${client.name}, це нагадування про ваш запис у Барбершоп STILEVO.`);
    if (platform === 'whatsapp' && contactInfo.whatsapp) {
        window.open(`https://wa.me/${contactInfo.whatsapp.replace(/\D/g,'')}?text=${message}`, '_blank');
    } else if (platform === 'telegram' && contactInfo.telegram) {
        window.open(`https://t.me/${contactInfo.telegram.replace('@', '')}`, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative pb-24">
      <button onClick={onBack} className="text-zinc-400 hover:text-white flex items-center gap-2 mb-6">
        <ArrowLeft size={20} /> Назад до Панелі
      </button>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                {paymentStatus === 'success' ? (
                    <div className="text-center py-8 animate-in zoom-in">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-2xl font-serif text-white mb-2">Оплата Успішна</h3>
                        <p className="text-zinc-400">Чек надіслано для {client.name}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-white">Обробити Платіж</h3>
                            <button onClick={() => setShowPayment(false)}><X size={20} className="text-zinc-500 hover:text-white"/></button>
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Сума (₴)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                                <input 
                                    type="number" 
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-9 text-white focus:ring-1 focus:ring-soul-500 focus:outline-none text-lg"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleProcessPayment}
                            disabled={!paymentAmount || paymentStatus === 'processing'}
                            className="w-full bg-soul-600 hover:bg-soul-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {paymentStatus === 'processing' ? (
                                <span className="animate-pulse">Обробка...</span>
                            ) : (
                                <>
                                    <CreditCard size={18} /> Оплата Карткою
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
      )}

      {/* Main Profile Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <img 
          src={client.avatarUrl} 
          alt={client.name} 
          className="w-32 h-32 rounded-full object-cover ring-4 ring-zinc-800"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-4xl font-serif text-white mb-2">{client.name}</h1>
                <div className="flex flex-wrap gap-4 text-zinc-400 text-sm mb-4">
                    <span className="flex items-center gap-1"><Calendar size={14} /> Клієнт з 2023</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> Візити кожні {client.frequency} тижнів</span>
                    <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${client.status === 'risk' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    {client.status.toUpperCase()}
                    </span>
                </div>
             </div>
             
             <div className="flex gap-2">
                 <button 
                    onClick={() => setShowPayment(true)}
                    className="bg-emerald-600/10 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                 >
                    <CreditCard size={16} /> Прийняти Оплату
                 </button>
             </div>
          </div>

          {/* Contact & Integration Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
             <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Контакти та Інтеграції</h3>
                {!isEditingContact && (
                    <button onClick={() => setIsEditingContact(true)} className="text-zinc-500 hover:text-white"><Edit2 size={14} /></button>
                )}
             </div>

             {isEditingContact ? (
                <div className="animate-in fade-in duration-200 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-2"><Phone size={12} /> Телефон</label>
                            <input 
                                type="tel"
                                value={contactInfo.phone} 
                                onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder-zinc-600 focus:border-soul-500 focus:ring-1 focus:ring-soul-500 outline-none transition-all" 
                                placeholder="+380 (XX) XXX-XX-XX"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-2"><Send size={12} /> Telegram</label>
                            <input 
                                type="text"
                                value={contactInfo.telegram} 
                                onChange={e => setContactInfo({...contactInfo, telegram: e.target.value})} 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder-zinc-600 focus:border-soul-500 focus:ring-1 focus:ring-soul-500 outline-none transition-all" 
                                placeholder="@username" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-2"><MessageCircle size={12} /> WhatsApp</label>
                            <input 
                                type="tel"
                                value={contactInfo.whatsapp} 
                                onChange={e => setContactInfo({...contactInfo, whatsapp: e.target.value})} 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder-zinc-600 focus:border-soul-500 focus:ring-1 focus:ring-soul-500 outline-none transition-all"
                                placeholder="+380 (XX) XXX-XX-XX"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                        <button 
                            onClick={handleCancelContact} 
                            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <X size={16} /> Скасувати
                        </button>
                        <button 
                            onClick={handleSaveContact} 
                            className="px-4 py-2 text-sm font-medium bg-soul-600 text-white rounded-lg hover:bg-soul-500 shadow-lg shadow-soul-900/20 transition-all flex items-center gap-2"
                        >
                            <Save size={16} /> Зберегти зміни
                        </button>
                    </div>
                </div>
             ) : (
                 <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-6 text-sm">
                        {contactInfo.phone && (
                            <div className="flex items-center gap-2 text-zinc-300">
                                <Phone size={14} className="text-zinc-500" /> {contactInfo.phone}
                            </div>
                        )}
                        {contactInfo.telegram && (
                            <div className="flex items-center gap-2 text-zinc-300">
                                <Send size={14} className="text-blue-400" /> {contactInfo.telegram}
                            </div>
                        )}
                        {contactInfo.whatsapp && (
                            <div className="flex items-center gap-2 text-zinc-300">
                                <MessageCircle size={14} className="text-green-500" /> {contactInfo.whatsapp}
                            </div>
                        )}
                         {!contactInfo.phone && !contactInfo.telegram && !contactInfo.whatsapp && (
                             <span className="text-zinc-600 italic">Контактна інформація відсутня.</span>
                         )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-800">
                         {contactInfo.telegram && (
                             <button onClick={() => sendReminder('telegram')} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
                                <Send size={12} /> Нагадати через Telegram
                             </button>
                         )}
                         {contactInfo.whatsapp && (
                             <button onClick={() => sendReminder('whatsapp')} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
                                <MessageCircle size={12} /> Нагадати через WhatsApp
                             </button>
                         )}
                         <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 ml-auto transition-colors">
                             <Share2 size={12} /> Копіювати посилання на запис
                         </button>
                    </div>
                 </div>
             )}
          </div>
          
          {/* Editable Notes Section */}
          <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/50 max-w-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Нотатки про клієнта</h3>
              {!isEditingNotes && (
                <button 
                  onClick={() => setIsEditingNotes(true)} 
                  className="text-zinc-500 hover:text-soul-400 transition-colors p-1"
                  title="Редагувати нотатки"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="animate-in fade-in duration-200">
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-200 text-sm focus:ring-1 focus:ring-soul-500 focus:outline-none min-h-[100px] resize-y placeholder-zinc-700"
                  placeholder="Додайте нотатки про вподобання клієнта, життєві події чи цілі стилю..."
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button 
                    onClick={handleCancelNotes}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <X size={12} /> Скасувати
                  </button>
                  <button 
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 text-xs bg-soul-600 text-white rounded hover:bg-soul-500 transition-colors flex items-center gap-1"
                  >
                    <Save size={12} /> Зберегти
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                {notes || <span className="text-zinc-600 italic">Нотаток немає. Натисніть редагувати, щоб додати деталі.</span>}
              </p>
            )}
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* History Column */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Історія Візитів</h2>
          <div className="space-y-4">
             {/* Mock History Items */}
             <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between mb-2">
                    <span className="text-zinc-300 font-medium">Відновлюючий Боб-Каре</span>
                    <span className="text-zinc-500 text-sm">12 Жовтня 2023</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-xs bg-zinc-800 text-soul-300 px-2 py-0.5 rounded">Відродження</span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">Відновлення після розриву</span>
                </div>
             </div>
             <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 opacity-60">
                <div className="flex justify-between mb-2">
                    <span className="text-zinc-300 font-medium">Довгі шари та Балаяж</span>
                    <span className="text-zinc-500 text-sm">15 Серпня 2023</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">Підтримка</span>
                </div>
             </div>
          </div>
        </div>

        {/* Action Column: Future Letter */}
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                <Mail size={20} className="text-soul-500"/> Комунікація після послуги
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
                Згенерувати "Лист від майбутнього себе" для {client.name} після їхньої нещодавньої трансформації.
            </p>

            {!generatedLetter ? (
                <button 
                    onClick={handleGenerateLetter}
                    disabled={isGenerating}
                    className="w-full py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors flex justify-center"
                >
                    {isGenerating ? "Створення повідомлення..." : "Згенерувати Лист"}
                </button>
            ) : (
                <div className="animate-in fade-in zoom-in duration-300">
                    <div className="bg-white text-zinc-900 p-6 rounded-xl font-serif text-lg leading-relaxed shadow-lg mb-4 relative">
                        <div className="absolute -top-3 -left-3 bg-soul-500 text-white p-2 rounded-full shadow-lg">
                            <Star size={16} fill="white" />
                        </div>
                        {generatedLetter}
                    </div>
                    <div className="flex gap-3">
                        <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm transition-colors">
                            Копіювати текст
                        </button>
                        <button className="flex-1 bg-soul-600 hover:bg-soul-500 text-white py-2 rounded-lg text-sm transition-colors">
                            Надіслати в WhatsApp
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Financial History Section */}
      <div className="mt-8 border-t border-zinc-800 pt-8">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Wallet size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">Фінансова Історія</h2>
          </div>
          
          {clientTransactions.length > 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {clientTransactions.map((tx, idx) => (
                    <div key={tx.id} className={`p-4 flex justify-between items-center hover:bg-zinc-800/50 transition-colors ${idx !== clientTransactions.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                        <div>
                            <div className="text-white font-medium mb-1">{tx.description}</div>
                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                <Calendar size={12} /> {new Date(tx.date).toLocaleDateString()}
                                <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                <span className="capitalize">{tx.category}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={`font-mono font-medium ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                 {tx.type === 'income' ? '+' : '-'}₴{tx.amount.toLocaleString()}
                             </div>
                             <div className="text-[10px] text-zinc-600 uppercase font-medium mt-1 bg-zinc-950 px-1.5 py-0.5 rounded inline-block">
                                 {tx.method || 'CASH'}
                             </div>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-8 text-center text-zinc-500">
                <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                <p>Транзакцій не знайдено.</p>
            </div>
          )}
      </div>

    </div>
  );
};

export default ClientProfile;
