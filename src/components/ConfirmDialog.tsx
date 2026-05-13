import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info } from 'lucide-react';

export interface DialogState {
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'danger';
  onConfirm: () => void;
  confirmLabel?: string;
}

interface ConfirmDialogProps {
  dialog: DialogState | null;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ dialog, onClose }) => {
  return (
    <AnimatePresence>
      {dialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-full max-w-sm themed-bg-secondary border themed-border rounded-[2.5rem] p-10 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                dialog.type === 'danger'
                  ? 'bg-red-500/10 border border-red-500/20'
                  : dialog.type === 'alert'
                  ? 'bg-blue-400/10 border border-blue-400/20'
                  : 'bg-neon-green/10 border border-neon-green/20'
              }`}>
                {dialog.type === 'alert'
                  ? <Info size={32} className="text-blue-400" />
                  : <AlertTriangle size={32} className={dialog.type === 'danger' ? 'text-red-500' : 'text-neon-green'} />
                }
              </div>
              <h3 className="text-lg font-black themed-text uppercase tracking-tight mb-3">{dialog.title}</h3>
              <p className="themed-text-dim text-sm font-medium leading-relaxed">{dialog.message}</p>
            </div>

            <div className={`grid gap-4 ${dialog.type === 'alert' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {dialog.type !== 'alert' && (
                <button
                  onClick={onClose}
                  className="py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => { dialog.onConfirm(); onClose(); }}
                className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  dialog.type === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : dialog.type === 'alert'
                    ? 'bg-blue-400 text-black hover:scale-[1.02]'
                    : 'bg-neon-green text-black hover:scale-[1.02]'
                }`}
              >
                {dialog.confirmLabel || (dialog.type === 'alert' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
