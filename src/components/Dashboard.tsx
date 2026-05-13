/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingCart, 
  CreditCard, 
  Calendar, 
  Clock, 
  Coffee, 
  Moon, 
  Sun,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Crown,
  Users,
  Car,
  BarChart3,
  ClipboardList,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Tab, TabStatus, User, UserRole, ProductType, Product } from '../types';

interface DashboardProps {
  currentUser: User;
  tabs: Tab[];
  inventory: Product[];
  staff: User[];
  onNavigate: (tab: 'sales' | 'tabs' | 'inventory' | 'reports' | 'debts') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, tabs, inventory, staff, onNavigate }) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Coffee };
    if (hour < 18) return { text: 'Good Afternoon', icon: Sun };
    return { text: 'Good Evening', icon: Moon };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    
    const todayTabs = tabs.filter(t => (t.createdAt || 0) >= today);
    const userTabsToday = todayTabs.filter(t => t.staffId === currentUser.id);

    const salesToday = todayTabs
      .filter(t => String(t.status).toUpperCase() === TabStatus.PAID)
      .reduce((sum, t) => sum + (t.total || 0), 0);
    
    const userSalesToday = userTabsToday
      .filter(t => String(t.status).toUpperCase() === TabStatus.PAID)
      .reduce((sum, t) => sum + (t.total || 0), 0);
    
    const activeOrders = tabs.filter(t => String(t.status).toUpperCase() === TabStatus.OPEN).length;
    const userActiveOrders = tabs.filter(t => t.staffId === currentUser.id && String(t.status).toUpperCase() === TabStatus.OPEN).length;

    const totalDebts = tabs
      .filter(t => String(t.status).toUpperCase() === TabStatus.UNPAID)
      .reduce((sum, t) => sum + (t.total || 0), 0);
    const debtCount = tabs.filter(t => String(t.status).toUpperCase() === TabStatus.UNPAID).length;

    // Count Car Washed
    const carWashedToday = todayTabs
      .filter(t => String(t.status).toUpperCase() === TabStatus.PAID)
      .reduce((sum, t) => {
        const carwashItems = t.items.filter(item => item.name.toLowerCase().includes('wash'));
        const count = carwashItems.reduce((s, i) => s + i.quantity, 0);
        return sum + count;
      }, 0);

    const lowStockItems = inventory.filter(i => i.stock < 10 && i.type !== ProductType.SERVICE);

    return {
      salesToday,
      userSalesToday,
      activeOrders,
      userActiveOrders,
      totalDebts,
      debtCount,
      carWashedToday,
      todayCount: todayTabs.length,
      userTodayCount: userTabsToday.length,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [tabs, inventory, currentUser]);

  const salesByHour = useMemo(() => {
    if (currentUser.role === UserRole.STAFF) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = today.getTime();
    
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sales: 0,
      count: 0
    }));

    tabs
      .filter(t => String(t.status).toUpperCase() === TabStatus.PAID && (t.createdAt || 0) >= startTime)
      .forEach(t => {
        const hour = new Date(t.createdAt || 0).getHours();
        hours[hour].sales += (t.total || 0);
        hours[hour].count += 1;
      });

    return hours.filter(h => h.sales > 0 || new Date().getHours() >= parseInt(h.hour));
  }, [tabs]);

  const staffSales = useMemo(() => {
    if (currentUser.role === UserRole.STAFF) return [];
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTime = todayStart.getTime();

    const paidTabs = tabs.filter(t => (String(t.status).toUpperCase() === TabStatus.PAID) && (t.createdAt || 0) >= todayTime);
    const salesByStaff: { [key: string]: number } = {};
    
    paidTabs.forEach(t => {
      salesByStaff[t.staffId] = (salesByStaff[t.staffId] || 0) + (t.total || 0);
    });

    return staff
      .map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        sales: salesByStaff[s.id] || 0
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [tabs, staff, currentUser]);

  const GreetingIcon = greeting.icon;

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GreetingIcon className="text-neon-green" size={16} />
            <span className="themed-text-dim text-[10px] font-black uppercase tracking-[0.3em]">{greeting.text}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black themed-text tracking-tighter leading-none">
            Welcome, <span className="text-neon-green">{currentUser.name.split(' ')[0]}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 bg-black/5 border themed-border rounded-2xl px-6 py-3 glass-panel">
          <Calendar size={16} className="text-neon-green" />
          <span className="text-sm font-bold themed-text opacity-80">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      {currentUser.role === UserRole.STAFF ? (
        <div className="space-y-8">
           <section className="luxury-card p-10 bg-gradient-to-br from-neon-green/5 to-transparent border-neon-green/10">
              <p className="text-[10px] themed-text-dim font-black uppercase tracking-[0.3em] mb-2 text-center md:text-left">Flash Summary</p>
              <h3 className="text-3xl md:text-4xl font-black themed-text tracking-tighter text-center md:text-left">
                Your total sales today are: <span className="text-neon-green">KES {stats.userSalesToday.toLocaleString()}</span>
              </h3>
              <p className="themed-text-dim text-xs font-medium mt-3 text-center md:text-left">Across {stats.userTodayCount} session sessions</p>
           </section>

           <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black themed-text flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                    <ClipboardList size={18} className="text-neon-green" />
                  </div>
                  Your Active Tabs
                </h3>
                <span className="px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-lg text-[10px] font-black uppercase tracking-widest">{stats.userActiveOrders} Live</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.filter(t => t.staffId === currentUser.id && t.status === TabStatus.OPEN).length === 0 ? (
                  <div className="col-span-full h-48 flex flex-col items-center justify-center themed-bg-secondary border themed-border rounded-[2.5rem] opacity-20">
                    <Plus size={32} className="themed-text mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest themed-text">No pending orders</p>
                    <button 
                      onClick={() => onNavigate('sales')}
                      className="mt-4 text-[10px] text-neon-green font-black uppercase tracking-widest underline underline-offset-4"
                    >
                      Create New Sale
                    </button>
                  </div>
                ) : (
                  tabs.filter(t => t.staffId === currentUser.id && t.status === TabStatus.OPEN).map(tab => (
                    <div 
                      key={tab.id} 
                      onClick={() => onNavigate('tabs')}
                      className="p-6 themed-bg-secondary border themed-border rounded-3xl hover:border-neon-green/20 transition-all cursor-pointer group"
                    >
                       <div className="flex justify-between items-start mb-4">
                         <h4 className="font-black themed-text truncate pr-4">{tab.customerName}</h4>
                         <ArrowUpRight size={14} className="themed-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div className="space-y-1 mb-4">
                          {tab.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-[10px] themed-text-dim truncate">{item.quantity}× {item.name}</p>
                          ))}
                          {tab.items.length > 2 && <p className="text-[10px] themed-text-dim opacity-50">+ {tab.items.length - 2} more items</p>}
                       </div>
                       <p className="text-lg font-black text-neon-green">KES {tab.total.toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
           </section>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {/* Daily Sales Card */}
            <StatCard 
              title="Sales Today" 
              value={`KES ${stats.salesToday.toLocaleString()}`} 
              icon={TrendingUp}
              description={`${stats.todayCount} total transactions`}
              color="neon-green"
              trend="+14.2%"
              trendUp={true}
              onClick={() => onNavigate('reports')}
            />
            
            {/* Low Stock Card (Conditional) */}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR || currentUser.role === UserRole.OWNER) && stats.lowStockCount > 0 ? (
              <StatCard 
                title="Low Stock" 
                value={stats.lowStockCount.toString()} 
                icon={Zap}
                description="Items requiring replenishment"
                color="red"
                trend="Alert active"
                trendUp={false}
                onClick={() => onNavigate('inventory')}
              />
            ) : (
              <StatCard 
                title="Cars Washed" 
                value={stats.carWashedToday.toString()} 
                icon={Car}
                description="Total vehicles processed today"
                color="blue"
                trend="Service Active"
                onClick={() => onNavigate('sales')}
              />
            )}

            {/* Active Orders Card */}
            <StatCard 
              title="Live Orders" 
              value={stats.activeOrders.toString()} 
              icon={ShoppingCart}
              description="Open tabs requiring service"
              color="neon-green"
              trend="In queue"
              onClick={() => onNavigate('tabs')}
            />

            {/* Debts Card */}
            <StatCard 
              title="Current Debts" 
              value={`KES ${stats.totalDebts.toLocaleString()}`} 
              icon={CreditCard}
              description={`${stats.debtCount} accounts pending`}
              color="red"
              trend="-2.4%"
              trendUp={false}
              onClick={() => onNavigate('debts')}
            />
          </div>

          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR || currentUser.role === UserRole.OWNER) && stats.lowStockCount > 0 && (
            <section className="luxury-card border-red-500/20 bg-red-500/[0.02] p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black themed-text flex items-center gap-3 uppercase tracking-tighter">
                  <Zap size={18} className="text-red-500 animate-pulse" />
                  Critical Inventory Alerts
                </h3>
                <button 
                  onClick={() => onNavigate('inventory')}
                  className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                >
                  Manage Stock
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border themed-border">
                    <div className="min-w-0">
                      <p className="font-black themed-text truncate leading-none">{item.name}</p>
                      <p className="text-[9px] themed-text-dim mt-1 font-black uppercase tracking-widest">{item.category}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-red-500 font-mono">{item.stock}</span>
                      <span className="text-[8px] themed-text-dim uppercase font-black tracking-tighter">UNITS LEFT</span>
                    </div>
                  </div>
                ))}
                {stats.lowStockCount > 3 && (
                  <button 
                    onClick={() => onNavigate('inventory')}
                    className="p-4 flex items-center justify-center bg-black/5 rounded-2xl border themed-border border-dashed hover:bg-black/10 transition-all text-[9px] themed-text-dim font-black uppercase tracking-[0.2em]"
                  >
                    + {stats.lowStockCount - 3} More items at risk
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="luxury-card p-10 relative overflow-hidden bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] group">
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black themed-text flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                    <BarChart3 size={18} className="text-neon-green" />
                  </div>
                  Sales Revenue by Time
                </h3>
                <p className="themed-text-dim text-xs font-medium mt-1">Hourly transaction volume and revenue intake</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-black/5 rounded-xl border themed-border">
                <Clock size={14} className="text-neon-green" />
                <span className="text-[10px] themed-text font-black uppercase tracking-widest leading-none">Live Stream</span>
              </div>
            </header>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }}
                    tickFormatter={(value) => `K${value/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 255, 136, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="themed-bg-secondary border themed-border p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                            <p className="text-[10px] themed-text-dim uppercase font-black tracking-widest mb-1">{payload[0].payload.hour}</p>
                            <p className="text-lg font-black text-neon-green">KES {payload[0].value?.toLocaleString()}</p>
                            <p className="text-[10px] themed-text italic mt-1 opacity-50">{payload[0].payload.count} transaction(s)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                    {salesByHour.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={new Date().getHours() === parseInt(entry.hour) ? '#00FF88' : 'rgba(0, 255, 136, 0.2)'} 
                        className="transition-all duration-500 hover:fill-neon-green"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR || currentUser.role === UserRole.OWNER) && (
            <div className="luxury-card p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 themed-text opacity-5">
                <Users size={120} />
              </div>
              <header className="mb-8 flex justify-between items-end">
                <div>
                  <h3 className="text-xl font-black themed-text flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                      <TrendingUp size={18} className="text-neon-green" />
                    </div>
                    Staff Performance
                  </h3>
                  <p className="themed-text-dim text-xs font-medium mt-1">Daily sales distribution by active terminal</p>
                </div>
                <Crown size={24} className="text-neon-green opacity-20" />
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffSales.map((s, idx) => (
                  <div key={s.id} className="p-5 bg-black/5 rounded-3xl border themed-border group hover:border-neon-green/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center themed-text-dim font-black">
                        {idx + 1}
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${String(s.role).toUpperCase() === UserRole.OWNER ? 'bg-neon-green text-black' : 'themed-bg-secondary themed-text-dim border themed-border'}`}>
                        {s.role}
                      </div>
                    </div>
                    <p className="text-[10px] themed-text-dim uppercase font-black mb-1 tracking-widest">{s.name}</p>
                    <p className="text-xl font-black themed-text">KES {s.sales.toLocaleString()}</p>
                    <div className="mt-4 h-1 bg-black/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neon-green shadow-[0_0_8px_#00FF88]" 
                        style={{ width: `${stats.salesToday > 0 ? (s.sales / stats.salesToday) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-10 pt-8 border-t themed-border flex justify-between items-center">
                 <span className="text-[10px] themed-text-dim font-black uppercase tracking-widest">Aggregate Shift Data Verified</span>
                 <span className="text-[9px] themed-text font-black uppercase tracking-widest opacity-30">Powered by August Tech</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function StatCard({ title, value, icon: Icon, description, color, trend, trendUp, onClick }: any) {
  const colorMap: any = {
    'neon-green': 'text-neon-green bg-neon-green/10 border-neon-green/20',
    'blue': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'red': 'text-red-500 bg-red-500/10 border-red-500/20'
  };

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={onClick}
      className={`luxury-card p-6 md:p-10 relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className={`absolute top-0 right-0 w-40 h-40 opacity-5 blur-3xl -mr-12 -mt-12 rounded-full ${color === 'neon-green' ? 'bg-neon-green' : color === 'blue' ? 'bg-blue-400' : 'bg-red-500'}`} />
      
      <div className="flex items-start justify-between mb-8">
        <div className={`p-5 rounded-2xl ${colorMap[color]} shadow-lg`}>
          <Icon size={28} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trendUp === true ? 'text-neon-green' : trendUp === false ? 'text-red-500' : 'themed-text-dim'}`}>
            {trendUp === true && <ArrowUpRight size={14} />}
            {trendUp === false && <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      
      <h3 className="text-[10px] font-black themed-text-dim uppercase tracking-[0.3em] mb-2">{title}</h3>
      <p className="text-4xl font-black themed-text tracking-tighter mb-3">{value}</p>
      <p className="text-[11px] themed-text-dim font-bold uppercase tracking-wider">{description}</p>
      {onClick && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight size={16} className="text-neon-green" />
        </div>
      )}
    </motion.div>
  );
}

function PerformanceItem({ label, value, color, width }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
        <span className="themed-text-dim">{label}</span>
        <span className="themed-text">{value}</span>
      </div>
      <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} 
        />
      </div>
    </div>
  );
}

function StatusTile({ label, value, icon }: any) {
  return (
    <div className="p-5 bg-black/5 rounded-3xl border themed-border group hover:border-neon-green/10 transition-colors">
       <p className="text-[9px] themed-text-dim uppercase font-black mb-1 tracking-widest">{label}</p>
       <div className="flex items-center gap-2">
         {icon}
         <span className="text-sm font-black themed-text tracking-tight">{value}</span>
       </div>
    </div>
  );
}
