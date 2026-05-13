/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Tab, TabStatus, Product, InventoryItem } from '../types';

interface ReportsProps {
  tabs: Tab[];
  inventory: InventoryItem[];
  staff: any[];
}

const COLORS = ['#00FF88', '#D4AF37', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B'];

export const Reports: React.FC<ReportsProps> = ({ tabs, inventory, staff }) => {
  const stats = useMemo(() => {
    const paidTabs = tabs.filter(t => t.status === TabStatus.PAID);
    const totalRevenue = paidTabs.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = paidTabs.length;
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    const unpaidRevenue = tabs.filter(t => t.status === TabStatus.UNPAID).reduce((sum, t) => sum + t.total, 0);

    // Sales by Category
    const categorySales: Record<string, number> = {};
    paidTabs.forEach(t => {
      t.items.forEach(item => {
        // We might need to look up category from inventory if it wasn't stored in item
        // But for many systems, it's easier if it's there. 
        // Let's assume we can find it in inventory or just group by name stem if needed.
        // For now, let's try to match with inventory
        const invItem = inventory.find(i => i.id === item.productId);
        const cat = invItem?.category || 'Other';
        categorySales[cat] = (categorySales[cat] || 0) + (item.priceAtSale * item.quantity);
      });
    });

    const categoryData = Object.entries(categorySales).map(([name, value]) => ({ name, value }));

    // Staff Performance
    const staffPerf = staff.map(s => {
      const staffSales = paidTabs.filter(t => t.staffId === s.id).reduce((sum, t) => sum + t.total, 0);
      return { name: s.name, sales: staffSales };
    }).filter(s => s.sales > 0).sort((a, b) => b.sales - a.sales);

    return {
      totalRevenue,
      totalTransactions,
      avgOrderValue,
      unpaidRevenue,
      categoryData,
      staffPerf
    };
  }, [tabs, inventory, staff]);

  return (
    <div className="h-full space-y-8 pb-10">
      <header>
        <h2 className="text-3xl font-black themed-text tracking-tighter">Business Intelligence</h2>
        <p className="themed-text-dim text-sm font-medium mt-1">Advanced financial analytics and inventory insights</p>
      </header>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Gross Revenue" 
          value={`KES ${stats.totalRevenue.toLocaleString()}`} 
          trend="+12.5%" 
          positive 
          icon={TrendingUp} 
        />
        <StatCard 
          label="Avg. Transaction" 
          value={`KES ${Math.round(stats.avgOrderValue).toLocaleString()}`} 
          trend="+3.2%" 
          positive 
          icon={DollarSign} 
        />
        <StatCard 
          label="Unpaid Ledger" 
          value={`KES ${stats.unpaidRevenue.toLocaleString()}`} 
          trend="Risk" 
          positive={false} 
          icon={Clock} 
        />
        <StatCard 
          label="Volume" 
          value={stats.totalTransactions.toString()} 
          trend="Live" 
          positive 
          icon={BarChartIcon} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="luxury-card p-8 themed-bg-secondary border themed-border">
          <h3 className="text-xl font-black themed-text mb-8 flex items-center gap-3">
             <PieChartIcon size={20} className="text-neon-green" />
             Revenue by Category
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                  itemStyle={{ color: '#FFF' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
             {stats.categoryData.map((cat, idx) => (
               <div key={cat.name} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                 <span className="text-[10px] themed-text-dim uppercase font-black tracking-widest">{cat.name}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="luxury-card p-8 themed-bg-secondary border themed-border">
          <h3 className="text-xl font-black themed-text mb-8 flex items-center gap-3">
             <Users size={20} className="text-neon-green" />
             Staff Performance (Today)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.staffPerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}
                  width={100}
                />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                   contentStyle={{ backgroundColor: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                />
                <Bar dataKey="sales" fill="#00FF88" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inventory Health Summary */}
      <div className="luxury-card p-8 themed-bg-secondary border themed-border">
         <h3 className="text-xl font-black themed-text mb-8 flex items-center gap-3">
             <Package size={20} className="text-neon-green" />
             Stock Health Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="p-4 bg-black/5 rounded-2xl border themed-border">
                <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Low Stock Warning</p>
                <p className="text-2xl font-black text-red-500">{inventory.filter(i => i.stock < 10).length}</p>
             </div>
             <div className="p-4 bg-black/5 rounded-2xl border themed-border">
                <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Total SKU Count</p>
                <p className="text-2xl font-black themed-text">{inventory.length}</p>
             </div>
             <div className="p-4 bg-black/5 rounded-2xl border themed-border">
                <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Total Unit Value</p>
                <p className="text-2xl font-black themed-text">~{Math.round(inventory.reduce((sum, i) => sum + (i.price * i.stock), 0) / 1000)}K</p>
             </div>
             <div className="p-4 bg-black/5 rounded-2xl border themed-border">
                <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Replenishments</p>
                <p className="text-2xl font-black themed-text">0</p>
             </div>
          </div>
      </div>
    </div>
  );
};

function StatCard({ label, value, trend, positive, icon: Icon }: any) {
  return (
    <div className="luxury-card p-6 themed-bg-secondary border themed-border flex flex-col justify-between h-36">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-black/5 border themed-border rounded-lg">
          <Icon size={18} className="text-neon-green" />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${positive ? 'text-neon-green' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] themed-text-dim uppercase font-black tracking-widest mb-1 opacity-50">{label}</p>
        <h4 className="text-2xl font-black themed-text tracking-tighter">{value}</h4>
      </div>
    </div>
  );
}
