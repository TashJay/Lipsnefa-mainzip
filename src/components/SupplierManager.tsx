import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Phone, Mail, Package, Search, X, Check } from 'lucide-react';
import { Supplier } from '../types';

const SUPPLIER_CATEGORIES = ['Beverages', 'Food & Produce', 'Spirits & Wine', 'Cleaning', 'Packaging', 'Equipment', 'Other'];

interface Props {
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
}

export const SupplierManager: React.FC<Props> = ({ suppliers, setSuppliers, deleteSupplier }) => {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Supplier | null>(null);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: Supplier) => {
    if (data.id === 'NEW') {
      const newSupplier = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
      await setSuppliers([newSupplier, ...suppliers]);
    } else {
      await setSuppliers(suppliers.map(s => s.id === data.id ? data : s));
    }
    setEditing(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    await deleteSupplier(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-black themed-text tracking-tighter">Suppliers</h2>
          <p className="text-[10px] themed-text-dim uppercase tracking-widest font-black mt-0.5">
            {suppliers.length} registered
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 themed-text-dim" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="w-full themed-bg-secondary border themed-border rounded-2xl py-3 pl-10 pr-4 text-sm themed-text focus:outline-none focus:border-neon-green/50 transition-all font-bold"
            />
          </div>
          <button
            onClick={() => setEditing({ id: 'NEW', name: '', phone: '', email: '', category: '', notes: '', createdAt: 0 })}
            className="px-5 py-3 bg-neon-green text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg whitespace-nowrap"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 themed-text-dim space-y-3">
          <Package size={40} className="opacity-20" />
          <p className="text-sm font-black uppercase tracking-widest opacity-40">No suppliers yet</p>
          <button
            onClick={() => setEditing({ id: 'NEW', name: '', phone: '', email: '', category: '', notes: '', createdAt: 0 })}
            className="mt-2 text-[10px] text-neon-green font-black uppercase tracking-widest underline underline-offset-4"
          >
            Add your first supplier
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(supplier => (
            <motion.div
              key={supplier.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 themed-bg-secondary border themed-border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neon-green/20 transition-all"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-neon-green/10 border border-neon-green/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Package size={18} className="text-neon-green" />
                </div>
                <div className="min-w-0">
                  <p className="font-black themed-text text-sm leading-tight truncate">{supplier.name}</p>
                  <p className="text-[9px] themed-text-dim uppercase font-black tracking-widest mt-0.5">{supplier.category}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {supplier.phone && (
                      <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 text-[10px] themed-text-dim hover:text-neon-green transition-colors">
                        <Phone size={10} /> {supplier.phone}
                      </a>
                    )}
                    {supplier.email && (
                      <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-[10px] themed-text-dim hover:text-neon-green transition-colors">
                        <Mail size={10} /> {supplier.email}
                      </a>
                    )}
                  </div>
                  {supplier.notes && (
                    <p className="text-[10px] themed-text-dim mt-1 italic opacity-70 line-clamp-1">{supplier.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 md:ml-4">
                <button
                  onClick={() => setEditing(supplier)}
                  className="p-3 bg-black/5 border themed-border rounded-2xl themed-text-dim hover:text-neon-green hover:border-neon-green/20 transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  className="p-3 bg-black/5 border themed-border rounded-2xl themed-text-dim hover:text-red-500 hover:border-red-500/20 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <SupplierEditModal
            supplier={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function SupplierEditModal({ supplier, onSave, onCancel }: {
  supplier: Supplier;
  onSave: (s: Supplier) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...supplier });

  const field = (key: keyof Supplier) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md themed-bg-secondary border themed-border rounded-[2.5rem] p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black themed-text">{supplier.id === 'NEW' ? 'New Supplier' : 'Edit Supplier'}</h3>
          <button onClick={onCancel} className="themed-text-dim hover:themed-text"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Field label="Supplier Name" required>
            <input {...field('name')} placeholder="e.g. Keroche Breweries" className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" required>
              <select {...field('category')} className={inputCls}>
                <option value="" disabled>Select…</option>
                {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Phone">
              <input {...field('phone')} placeholder="07XXXXXXXX" className={inputCls} />
            </Field>
          </div>

          <Field label="Email">
            <input {...field('email')} type="email" placeholder="contact@supplier.co.ke" className={inputCls} />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Payment terms, lead time, etc."
              className={inputCls + ' resize-none'}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button onClick={onCancel} className="py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all">
            Cancel
          </button>
          <button
            onClick={() => form.name && form.category && onSave(form)}
            disabled={!form.name || !form.category}
            className="py-4 bg-neon-green text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 shadow-[0_10px_20px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2"
          >
            <Check size={14} /> Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block">
        {label}{required && <span className="text-neon-green ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full themed-bg-primary border themed-border rounded-2xl py-3.5 px-5 text-sm themed-text focus:outline-none focus:border-neon-green/50 transition-all font-bold appearance-none';
