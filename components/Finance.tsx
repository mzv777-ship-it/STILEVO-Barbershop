
import React, { useState, useMemo } from 'react';
import { Transaction, AppView } from '../types';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Plus, Calendar, Filter, PieChart, Wallet, BarChart3, Info } from 'lucide-react';

interface FinanceProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onNavigate: (view: AppView) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Supplies': '#ef4444', // red-500
    'Rent': '#8b5cf6', // violet-500
    'Utilities': '#f59e0b', // amber-500
    'Marketing': '#ec4899', // pink-500
    'Other': '#71717a', // zinc-500
    'Service': '#10b981', // emerald-500
    'Product': '#3b82f6', // blue-500
};

const getColor = (cat: string, index: number) => {
    if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
    const colors = ['#06b6d4', '#d946ef', '#6366f1', '#f43f5e'];
    return colors[index % colors.length];
};

const Finance: React.FC<FinanceProps> = ({ transactions, onAddTransaction, onNavigate }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrans, setNewTrans] = useState<{
    type: 'income' | 'expense';
    amount: string;
    category: string;
    description: string;
  }>({
    type: 'expense',
    amount: '',
    category: 'Supplies',
    description: ''
  });

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return {
      income,
      expense,
      profit: income - expense
    };
  }, [transactions]);

  // Expense Breakdown for Current Month
  const expenseBreakdown = useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const expenses = transactions.filter((t: Transaction) => {
           const d = new Date(t.date);
           return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      const total = expenses.reduce((acc, t) => acc + t.amount, 0);
      const grouped = expenses.reduce((acc: Record<string, number>, t: Transaction) => {
          const current = acc[t.category] || 0;
          acc[t.category] = current + t.amount;
          return acc;
      }, {} as Record<string, number>);

      let cumulativePercent = 0;
      return Object.entries(grouped)
          .map(([category, amount]) => {
              const numAmount = Number(amount);
              const numTotal = Number(total);
              const percent = numTotal === 0 ? 0 : (numAmount / numTotal) * 100;
              
              const item = {
                  category,
                  amount: numAmount,
                  percent,
                  offset: cumulativePercent,
                  color: getColor(category, 0) // Index not strictly needed if using map
              };
              cumulativePercent += percent;
              return item;
          })
          .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalMonthlyExpense = expenseBreakdown.reduce((acc: number, item) => acc + item.amount, 0);

  const handleSave = () => {
    if (!newTrans.amount) return;
    
    // Determine default description based on category if empty
    let finalDescription = newTrans.description;
    if (!finalDescription) {
        if (newTrans.type === 'income') {
             // If category is a specific service, use it as description, otherwise generic
             finalDescription = (newTrans.category === 'Service' || newTrans.category === 'Other') ? 'Ручне поповнення' : newTrans.category;
        } else {
             finalDescription = 'Витрати';
        }
    }

    onAddTransaction({
      amount: parseFloat(newTrans.amount),
      date: new Date().toISOString(),
      type: newTrans.type,
      category: newTrans.category,
      description: finalDescription,
      clientName: newTrans.type === 'income' ? 'Клієнт' : undefined
    });
    setShowAddModal(false);
    setNewTrans({ type: 'expense', amount: '', category: 'Supplies', description: '' });
  };

  // Prepare data for simple bar chart (last 7 transactions or grouped by day)
  const chartData = useMemo(() => {
      // Group by day for the last 5 days
      const days = Array.from({length: 5}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (4 - i));
          return d.toISOString().split('T')[0];
      });

      return days.map(day => {
          const dayTrans = transactions.filter(t => t.date.startsWith(day));
          const inc = dayTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
          const exp = dayTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
          return { day, inc, exp };
      });
  }, [transactions]);

  const maxVal = Math.max(...chartData.map(d => Math.max(d.inc, d.exp)), 1000);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center">
        <div>
           <button onClick={() => onNavigate(AppView.DASHBOARD)} className="text-zinc-400 hover:text-white flex items-center gap-2 mb-2">
            <ArrowLeft size={20} /> Назад
          </button>
          <h1 className="text-3xl font-serif font-semibold text-white">Бухгалтерія</h1>
          <p className="text-zinc-400">Фінансовий огляд та динаміка заробітку</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-soul-600 hover:bg-soul-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Додати операцію
        </button>
      </header>

      {/* Summary Cards with Tooltips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative group cursor-help transition-colors hover:border-zinc-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Дохід</h3>
          </div>
          <p className="text-4xl font-semibold text-white">₴{stats.income.toLocaleString()}</p>
          
          {/* Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-zinc-800 border border-zinc-700 p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
             <div className="text-xs text-zinc-400 mb-1">За весь період:</div>
             <div className="text-white font-mono font-medium">₴{stats.income.toLocaleString()}</div>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative group cursor-help transition-colors hover:border-zinc-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <TrendingDown size={24} />
            </div>
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Витрати</h3>
          </div>
          <p className="text-4xl font-semibold text-white">₴{stats.expense.toLocaleString()}</p>

          {/* Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-zinc-800 border border-zinc-700 p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
             <div className="text-xs text-zinc-400 mb-1">За весь період:</div>
             <div className="text-white font-mono font-medium">₴{stats.expense.toLocaleString()}</div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-visible group cursor-help transition-colors hover:border-zinc-700">
          <div className="absolute top-0 right-0 p-32 bg-soul-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-soul-500/10 text-soul-400 rounded-lg">
              <Wallet size={24} />
            </div>
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Чистий Прибуток</h3>
          </div>
          <p className={`text-4xl font-semibold relative z-10 ${stats.profit >= 0 ? 'text-white' : 'text-red-400'}`}>
            ₴{stats.profit.toLocaleString()}
          </p>
          
          {/* Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-zinc-800 border border-zinc-700 p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
             <div className="text-xs text-zinc-400 mb-1">Net Profit (Всього):</div>
             <div className={`font-mono font-medium ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                 {stats.profit > 0 ? '+' : ''}₴{stats.profit.toLocaleString()}
             </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bar Chart Section */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
                <BarChart3 size={18} className="text-zinc-400"/> Динаміка (Останні 5 днів)
            </h3>
            <div className="h-64 flex items-end justify-between gap-4">
                {chartData.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative cursor-pointer">
                        {/* Unified Tooltip for the Day */}
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 min-w-[140px]">
                            <p className="text-zinc-400 text-xs mb-2 border-b border-zinc-700 pb-1 font-medium text-center">
                                {new Date(d.day).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                            </p>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500">Дохід:</span>
                                    <span className="text-emerald-400 font-mono">+₴{d.inc}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500">Витрати:</span>
                                    <span className="text-red-400 font-mono">-₴{d.exp}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bars Container */}
                        <div className="w-full bg-zinc-800/30 rounded-t-lg relative h-full flex items-end justify-center overflow-hidden gap-1 px-1 pt-2 group-hover:bg-zinc-800/50 transition-colors">
                             {/* Income Bar */}
                             <div 
                                style={{ height: `${Math.max((d.inc / maxVal) * 90, 2)}%` }}
                                className="w-full bg-emerald-500/80 rounded-t-sm transition-all duration-500 relative group-hover:bg-emerald-400"
                             ></div>
                             
                             {/* Expense Bar */}
                             <div 
                                style={{ height: `${Math.max((d.exp / maxVal) * 90, 2)}%` }}
                                className="w-full bg-red-500/80 rounded-t-sm transition-all duration-500 relative group-hover:bg-red-400"
                             ></div>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono group-hover:text-white transition-colors">{d.day.slice(5)}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Breakdown Donut */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
           <h3 className="text-white font-medium mb-6 flex items-center gap-2">
                <PieChart size={18} className="text-zinc-400"/> Структура Витрат (Місяць)
            </h3>
            
            <div className="relative w-48 h-48 mx-auto mb-6">
                 {/* CSS Conic Gradient for Pie Chart */}
                 <div 
                    className="w-full h-full rounded-full"
                    style={{
                        background: `conic-gradient(${expenseBreakdown.map(item => 
                            `${item.color} ${item.offset}%, ${item.color} ${item.offset + item.percent}%`
                        ).join(', ')})`
                    }}
                 >
                    <div className="absolute inset-4 bg-zinc-900 rounded-full flex items-center justify-center flex-col">
                        <span className="text-xs text-zinc-500">Всього</span>
                        <span className="text-xl font-bold text-white">₴{totalMonthlyExpense.toLocaleString()}</span>
                    </div>
                 </div>
            </div>

            <div className="space-y-3">
                {expenseBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-zinc-300">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                             <span className="text-white font-medium">₴{item.amount}</span>
                             <span className="text-zinc-500 text-xs w-8 text-right">{Math.round(item.percent)}%</span>
                        </div>
                    </div>
                ))}
                {expenseBreakdown.length === 0 && (
                    <p className="text-zinc-500 text-center italic text-sm">Витрат у цьому місяці поки немає.</p>
                )}
            </div>
        </div>
      </div>

      {/* Transactions List */}
      <div>
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
           <Filter size={18} className="text-zinc-400" /> Останні Операції
        </h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx, i) => (
                <div key={tx.id} className={`p-4 flex justify-between items-center ${i !== transactions.length -1 ? 'border-b border-zinc-800' : ''}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {tx.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div>
                            <div className="text-white font-medium">{tx.description}</div>
                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                <span>{new Date(tx.date).toLocaleDateString()}</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                <span>{tx.category}</span>
                                {tx.method && (
                                    <>
                                     <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                     <span className="uppercase">{tx.method}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={`font-mono font-medium ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}₴{tx.amount.toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-serif text-white">Нова Операція</h3>
                      <button onClick={() => setShowAddModal(false)}><Plus size={24} className="rotate-45 text-zinc-500 hover:text-white"/></button>
                  </div>
                  
                  <div className="space-y-4">
                      {/* Type Toggle */}
                      <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl">
                          <button 
                            onClick={() => setNewTrans({...newTrans, type: 'income'})}
                            className={`py-2 rounded-lg text-sm font-medium transition-all ${newTrans.type === 'income' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                              Дохід
                          </button>
                          <button 
                             onClick={() => setNewTrans({...newTrans, type: 'expense'})}
                             className={`py-2 rounded-lg text-sm font-medium transition-all ${newTrans.type === 'expense' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                              Витрата
                          </button>
                      </div>

                      <div>
                          <label className="text-xs text-zinc-500 uppercase font-medium mb-1.5 block">Сума</label>
                          <div className="relative">
                              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                              <input 
                                type="number" 
                                value={newTrans.amount}
                                onChange={e => setNewTrans({...newTrans, amount: e.target.value})}
                                className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-9 text-white focus:ring-1 focus:ring-soul-500 focus:outline-none"
                                placeholder="0.00"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs text-zinc-500 uppercase font-medium mb-1.5 block">Категорія</label>
                          <select 
                            value={newTrans.category}
                            onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                            className="w-full bg-black border border-zinc-700 rounded-xl py-3 px-3 text-white focus:ring-1 focus:ring-soul-500 focus:outline-none appearance-none"
                          >
                              {newTrans.type === 'expense' ? (
                                  Object.keys(CATEGORY_COLORS).filter(c => c !== 'Service' && c !== 'Product').map(c => <option key={c} value={c}>{c}</option>)
                              ) : (
                                  <>
                                    <option value="Service">Service</option>
                                    <option value="Product">Product</option>
                                    <option value="Other">Other</option>
                                  </>
                              )}
                          </select>
                      </div>
                      
                      <div>
                          <label className="text-xs text-zinc-500 uppercase font-medium mb-1.5 block">Опис (Необов'язково)</label>
                          <input 
                            type="text" 
                            value={newTrans.description}
                            onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                            className="w-full bg-black border border-zinc-700 rounded-xl py-3 px-3 text-white focus:ring-1 focus:ring-soul-500 focus:outline-none"
                            placeholder={newTrans.type === 'expense' ? 'Наприклад: Закупка шампунів' : 'Наприклад: Стрижка'}
                          />
                      </div>

                      <button 
                        onClick={handleSave}
                        className="w-full bg-soul-600 hover:bg-soul-500 text-white py-3 rounded-xl font-medium mt-4 shadow-lg shadow-soul-900/20"
                      >
                          Зберегти
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Finance;
