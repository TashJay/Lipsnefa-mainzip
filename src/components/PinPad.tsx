import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, Lock, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';

interface PinPadProps {
  onSuccess: (pin: string) => void;
  error?: string;
  isOnline?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({ onSuccess, error, isOnline = true }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handlePress = (val: string) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        onSuccess(newPin);
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'toggle', '0', 'back'];

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 themed-bg-secondary backdrop-blur-3xl border themed-border rounded-[3rem] w-full max-w-md mx-auto shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-neon-green/30" />

      <div className="absolute top-4 right-4">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${
          isOnline
            ? 'bg-neon-green/10 border-neon-green/20 text-neon-green'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {isOnline
            ? <Wifi size={10} />
            : <WifiOff size={10} />
          }
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="mb-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-neon-green/10 rounded-[2rem] flex items-center justify-center mb-6 border border-neon-green/20 shadow-lg">
          <Lock className="text-neon-green w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter themed-text uppercase">Lips <span className="text-neon-green">&</span> Sips</h2>
        <p className="themed-text-dim text-[10px] font-black uppercase tracking-[0.4em] mt-2">Secure Terminal Access</p>
        {!isOnline && (
          <p className="mt-3 text-[9px] text-amber-400 font-black uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-1.5">
            Local mode — cached data only
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 mb-10">
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                pin.length > i
                  ? 'bg-neon-green border-neon-green scale-125 shadow-[0_0_12px_#00FF88]'
                  : 'themed-border border-2'
              }`}
            >
              {showPin && pin.length > i && (
                <span className="text-black text-[8px] font-black">{pin[i]}</span>
              )}
            </div>
          ))}
        </div>
        {pin.length > 0 && (
          <p className="text-[10px] themed-text-dim font-black uppercase tracking-widest mt-2">
            {showPin ? pin : '••••'}
          </p>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden w-full"
          >
            <p className="text-red-500 text-[10px] mb-6 font-black uppercase tracking-widest text-center">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-4 md:gap-5 w-full">
        {buttons.map((btn, i) => {
          if (btn === 'toggle') {
            return (
              <button
                key={i}
                onClick={() => setShowPin(!showPin)}
                className={`h-16 md:h-20 flex items-center justify-center rounded-[1.5rem] transition-all active:scale-95 border ${showPin ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' : 'themed-bg-primary themed-text-dim/50 themed-border shadow-sm'}`}
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            );
          }
          if (btn === 'back') {
            return (
              <button
                key={i}
                onClick={handleBackspace}
                className="h-16 md:h-20 flex items-center justify-center rounded-[1.5rem] themed-bg-primary text-red-500/50 hover:bg-black/5 hover:text-red-500 transition-all active:scale-95 border themed-border"
              >
                <Delete size={24} />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handlePress(btn)}
              className="h-16 md:h-20 text-3xl font-black rounded-[1.5rem] themed-bg-primary themed-text hover:bg-neon-green hover:text-black transition-all border themed-border hover:border-neon-green active:scale-95 shadow-sm"
            >
              {btn}
            </button>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center">
        <span className="text-[10px] themed-text-dim opacity-30 font-black uppercase tracking-[0.3em]">Powered by August Tech</span>
      </div>
    </div>
  );
};
