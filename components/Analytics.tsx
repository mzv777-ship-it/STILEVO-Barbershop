import React, { useState, useMemo } from 'react';
import { Transaction, AppView } from '../types';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart, Activity, Filter } from 'lucide-react';

interface AnalyticsProps {
  transactions: Transaction[];
  onNavigate: (view: AppView) => void;
}

type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface AnalyticsGroupedItem {
  income: number;
  expense: number;
  profit: number;
  count: number;
  label: string;
  fullDate: string;
  sortValue: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ transactions, onNavigate }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');

  // Helper to get week number
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const analyticsData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0); // Epoch for ALL
    
    // 1. Determine Start Date based on Range
    switch (timeRange) {
        case '1W':
            startDate = new Date();
            startDate.setDate(now.getDate() - 7);
            break;
        case '1M':
            startDate = new Date();
            startDate.setDate(now.getDate() - 30);
            break;
        case '3M':
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 3);
            break;
        case '1Y':
            startDate = new Date();
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate = new Date(0);
    }

    // 2. Filter Transactions
    const filtered = transactions.filter(t => new Date(t.date) >= startDate);

    // 3. Grouping Logic
    const groupingType = (timeRange === '1W' || timeRange === '1M') ? 'day' : (timeRange === '3M' ? 'week' : 'month');

    const grouped = filtered.reduce((acc, t) => {
        const d = new Date(t.date);
        let key = '';
        let label = '';
        let sortValue = 0;

        if (groupingType === 'day') {
            key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            label = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
            sortValue = d.getTime();
        } else if (groupingType === 'week') {
            const year = d.getFullYear();
            const week = getWeekNumber(d);
            key = `${year}-W${week}`;
            label = `Тиж. ${week}`; // Week number
            sortValue = year * 100 + week; // Simple sort key
        } else {
            // Month
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            label = d.toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' });
            sortValue = d.getFullYear() * 100 + d.getMonth();
        }
        
        if (!acc[key]) {
            acc[key] = { 
                income: 0, 
                expense: 0, 
                profit: 0, 
                count: 0, 
                label, 
                fullDate: key,
                sortValue 
            };
        }
        
        if (t.type === 'income') {
            acc[key].income += t.amount;
        } else {
            acc[key].expense += t.amount;
        }
        acc[key].count += 1;
        return acc;
    }, {} as Record<string, AnalyticsGroupedItem>);

    // 4. Convert to Array and Sort
    let sortedData = (Object.values(grouped) as AnalyticsGroupedItem[]).sort((a, b) => a.sortValue - b.sortValue);

    // 5. Calculate Growth
    return sortedData.map((item, index) => {
        item.profit = item.income - item.expense;
        
        const prevItem = sortedData[index - 1];
        let growth = 0;
        let growthType: 'positive' | 'negative' | 'neutral' = 'neutral';
        
        if (prevItem) {
            if (prevItem.income > 0) {
                growth = ((item.income - prevItem.income) / prevItem.income) * 100;
            } else if (item.income > 0) {
                growth = 100;
            }
        }
        
        if (growth > 0) growthType = 'positive';
        if (growth < 0) growthType = 'negative';

        return {
            ...item,
            growth,
            growthType
        };
    });

  }, [transactions, timeRange]);

  // Overall Stats (Based on filtered period)
  const totalStats = useMemo(() => {
      const totalIncome = analyticsData.reduce((acc, d) => acc + d.income, 0);
      const totalExpense = analyticsData.reduce((acc, d) => acc + d.expense, 0);
      const totalProfit = totalIncome - totalExpense;
      const margin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;
      
      return { totalIncome, totalExpense, totalProfit, margin };
  }, [analyticsData]);

  // Max value for Chart Scaling
  const maxChartValue = Math.max(...analyticsData.map(d => Math.max(d.income, d.expense)), 1000);

  // Helper for tab styling
  const getTabClass = (range: TimeRange) => 
    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === range 
        ? 'bg-soul-600 text-white shadow-lg shadow-soul-900/20' 
        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <button onClick={() => onNavigate(AppView.DASHBOARD)} className="text-zinc-400 hover:text-white flex items-center gap-2 mb-2">
            <ArrowLeft size={20} /> Назад
          </button>
          <h1 className="text-3xl font-serif font-semibold text-white">Бізнес Аналітика</h1>
          <p className="text-zinc-400">
             {timeRange === '1W' ? 'Динаміка за останній тиждень (по днях)' :
              timeRange === '1M' ? 'Динаміка за останні 30 днів (по днях)' :
              timeRange === '3M' ? 'Динаміка за квартал (по тижнях)' :
              'Динаміка за рік (по місяцях)'}
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex flex-wrap gap-1">
            <button onClick={() => setTimeRange('1W')} className={getTabClass('1W')}>Тиждень</button>
            <button onClick={() => setTimeRange('1M')} className={getTabClass('1M')}>Місяць</button>
            <button onClick={() => setTimeRange('3M')} className={getTabClass('3M')}>Квартал</button>
            <button onClick={() => setTimeRange('1Y')} className={getTabClass('1Y')}>Рік</button>
            <button onClick={() => setTimeRange('ALL')} className={getTabClass('ALL')}>Все</button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Дохід (Період)</div>
          <div className="text-2xl font-bold text-white mb-2">₴{totalStats.totalIncome.toLocaleString()}</div>
          <div className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp size={12} /> {analyticsData.length} записів
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Витрати (Період)</div>
          <div className="text-2xl font-bold text-white mb-2">₴{totalStats.totalExpense.toLocaleString()}</div>
          <div className="text-xs text-red-400 flex items-center gap-1">
              <TrendingDown size={12} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Чистий Прибуток</div>
          <div className={`text-2xl font-bold mb-2 ${totalStats.totalProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              ₴{totalStats.totalProfit.toLocaleString()}
          </div>
           <div className="text-xs text-zinc-500">Net Profit</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Рентабельність</div>
          <div className="text-2xl font-bold text-soul-300 mb-2">{totalStats.margin.toFixed(1)}%</div>
          <div className="text-xs text-zinc-500">Margin</div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Dynamic Chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col">
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
                <Activity size={18} className="text-soul-500"/> 
                Графік Прибутку
                <span className="text-zinc-500 text-xs ml-auto font-normal">
                    {timeRange === '1M' ? 'Прокрутіть для деталей →' : ''}
                </span>
            </h3>
            
            {/* Scrollable Container for high-density data (like 30 days) */}
            <div className="flex-1 min-h-[320px] overflow-x-auto custom-scrollbar pb-2">
                <div className="h-full flex items-end gap-2 pt-8" style={{ minWidth: analyticsData.length > 20 ? '800px' : '100%' }}>
                    {analyticsData.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group min-w-[30px]">
                            
                            {/* Unified Bar Container */}
                            <div className="w-full relative flex items-end justify-center gap-[2px] h-full">
                                {/* Income Bar */}
                                <div 
                                    style={{ height: `${Math.max((d.income / maxChartValue) * 100, 2)}%` }}
                                    className="w-full bg-emerald-500/80 rounded-t-sm transition-all duration-700 relative group-hover:bg-emerald-400"
                                ></div>

                                {/* Expense Bar */}
                                <div 
                                    style={{ height: `${Math.max((d.expense / maxChartValue) * 100, 2)}%` }}
                                    className="w-full bg-red-500/80 rounded-t-sm transition-all duration-700 relative group-hover:bg-red-400"
                                ></div>
                            </div>

                            {/* Tooltip */}
                            <div className="absolute opacity-0 group-hover:opacity-100 bg-zinc-800 border border-zinc-700 p-2 rounded-lg text-xs z-20 bottom-24 transition-opacity pointer-events-none shadow-xl min-w-[120px]">
                                <div className="font-bold text-white mb-1 border-b border-zinc-700 pb-1">{d.label}</div>
                                <div className="flex justify-between gap-4"><span className="text-zinc-400">Дохід:</span> <span className="text-emerald-400">+₴{d.income}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-zinc-400">Витрати:</span> <span className="text-red-400">-₴{d.expense}</span></div>
                                <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-zinc-700"><span className="text-zinc-300">Net:</span> <span className="text-white font-bold">₴{d.profit}</span></div>
                            </div>

                            <span className="text-[10px] text-zinc-500 font-mono mt-2 truncate w-full text-center">{d.label}</span>
                        </div>
                    ))}
                    {analyticsData.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 italic">Немає даних за цей період</div>
                    )}
                </div>
            </div>
        </div>

        {/* Growth Sidebar */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl overflow-y-auto max-h-[500px] custom-scrollbar">
             <h3 className="text-white font-medium mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-zinc-400"/> Ріст ({timeRange === '1M' || timeRange === '1W' ? 'Day-to-Day' : 'MoM/WoW'})
            </h3>
            <div className="space-y-4">
                {[...analyticsData].reverse().slice(0, 12).map((data, idx) => ( // Limit to last 12 entries
                    <div key={idx} className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium text-sm">{data.label}</span>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1
                                ${data.growthType === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : 
                                  data.growthType === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-500'}
                            `}>
                                {data.growthType === 'positive' ? <TrendingUp size={10}/> : 
                                 data.growthType === 'negative' ? <TrendingDown size={10}/> : null}
                                {data.growth > 0 ? '+' : ''}{Math.round(data.growth)}%
                            </span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                             <span>Дохід: ₴{data.income.toLocaleString()}</span>
                             <span>Net: <span className={data.profit >= 0 ? 'text-zinc-300' : 'text-red-400'}>₴{data.profit.toLocaleString()}</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>

      {/* Detailed Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
           <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-white font-medium">Деталізований Звіт ({timeRange})</h3>
                <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                    Експорт CSV
                </button>
           </div>
           <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-zinc-400">
                   <thead className="bg-zinc-950 uppercase text-xs font-medium text-zinc-500">
                       <tr>
                           <th className="px-6 py-4">Період / Дата</th>
                           <th className="px-6 py-4">К-сть транзакцій</th>
                           <th className="px-6 py-4 text-emerald-500">Дохід</th>
                           <th className="px-6 py-4 text-red-500">Витрати</th>
                           <th className="px-6 py-4 text-white">Чистий Прибуток</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800">
                       {[...analyticsData].reverse().map((row, i) => (
                           <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                               <td className="px-6 py-4 font-medium text-white">
                                   {row.label} 
                                   <span className="text-zinc-600 text-xs ml-2 font-normal">({row.fullDate})</span>
                               </td>
                               <td className="px-6 py-4">{row.count}</td>
                               <td className="px-6 py-4 text-emerald-400">+₴{row.income.toLocaleString()}</td>
                               <td className="px-6 py-4 text-red-400">-₴{row.expense.toLocaleString()}</td>
                               <td className="px-6 py-4 font-bold text-white">₴{row.profit.toLocaleString()}</td>
                           </tr>
                       ))}
                       {analyticsData.length === 0 && (
                           <tr>
                               <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                   Немає даних для відображення за обраний період.
                               </td>
                           </tr>
                       )}
                   </tbody>
               </table>
           </div>
      </div>

    </div>
  );
};

export default Analytics;