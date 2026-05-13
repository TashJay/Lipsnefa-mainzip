import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, ShoppingCart, User as UserIcon, LogOut,
  Settings, CreditCard, ClipboardList, Package, Users,
  History, Wifi, WifiOff, X, Check, Save, RotateCcw,
  Sun, Moon, Zap, Crown, Eye, EyeOff, ArrowDown, Printer,
  TrendingUp, Trash2, FileText
} from 'lucide-react';
import { PinPad } from './components/PinPad';
import { TransactionModal } from './components/TransactionModal';
import { Receipt } from './components/Receipt';
import { Dashboard } from './components/Dashboard';
import { Reports } from './components/Reports';
import { ConfirmDialog, DialogState } from './components/ConfirmDialog';
import { usePOSData } from './hooks/usePOSData';
import { hashPin } from './lib/crypto';
import { User, UserRole, TabStatus, Product, TabItem, Tab, ProductType, Room } from './types';

export default function App() {
  const {
    staff, setStaff,
    inventory, setInventory,
    tabs, setTabs, deleteTab,
    rooms, setRooms,
    auditLogs,
    addAuditLog,
    isOnline,
    isLoading,
    loginWithGoogle,
    isAuthenticated
  } = usePOSData();

  // ── All state must come before any conditional returns ──────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'sales' | 'tabs' | 'inventory' | 'staff' | 'audit' | 'debts' | 'rooms' | 'reports'
  >('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  });

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const closeDialog = () => setDialog(null);

  const [cart, setCart] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [overrideItem, setOverrideItem] = useState<TabItem | null>(null);
  const [printingTab, setPrintingTab] = useState<Tab | null>(null);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [shiftNote, setShiftNote] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // ── All effects must come before any conditional returns ────────────────────

  // Auto-logout using a ref so the interval doesn't recreate every second
  useEffect(() => {
    if (!currentUser) return;
    const timeout = 60000;
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > timeout) {
        handleLogout();
      }
    }, 5000);
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('click', updateActivity);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [currentUser]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 100);
      }
    };
    const el = scrollRef.current;
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Memos ───────────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    return Array.from(new Set(inventory.map(item => item.category)));
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const speedMenu = useMemo(() => {
    return inventory.filter(item => item.isQuickSell);
  }, [inventory]);

  // ── Helper functions ────────────────────────────────────────────────────────

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'confirm' | 'danger' = 'confirm') => {
    setDialog({ title, message, type, onConfirm });
  };

  const showAlert = (title: string, message: string) => {
    setDialog({ title, message, type: 'alert', onConfirm: closeDialog });
  };

  const handleLogin = async (pin: string) => {
    const hashed = await hashPin(pin);
    // Try hashed PIN first, then fall back to plain text for legacy accounts
    let user = staff.find(u => u.pin === hashed) || staff.find(u => u.pin === pin);
    if (user) {
      setCurrentUser(user);
      setLoginError('');
      addAuditLog(user, 'Login', 'User logged in to terminal');
    } else {
      setLoginError('Invalid PIN');
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      addAuditLog(currentUser, 'Logout', 'User logged out');
    }
    setCurrentUser(null);
    setCart([]);
    setActiveTabId(null);
    setCustomerName('');
    setDialog(null);
  };

  const clearCart = () => {
    if (cart.length > 0) {
      showConfirm(
        'Cancel Order',
        'Are you sure you want to cancel this entire order?',
        () => {
          setCart([]);
          setActiveTabId(null);
          setCustomerName('');
          addAuditLog(currentUser!, 'Order Cancelled', 'Staff cleared the current cart');
        },
        'danger'
      );
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        priceAtSale: Math.round(product.price)
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handlePriceOverride = (productId: string, newPrice: number) => {
    if (String(currentUser?.role).toUpperCase() === UserRole.STAFF) return;
    setCart(prev =>
      prev.map(i =>
        i.productId === productId ? { ...i, priceAtSale: Math.round(newPrice) } : i
      )
    );
    setOverrideItem(null);
    addAuditLog(currentUser!, 'Price Override', `Changed price of item ${productId} to KES ${Math.round(newPrice)}`);
  };

  const deductStock = (items: TabItem[]) => {
    const updatedInventory = inventory.map(invItem => {
      const soldItem = items.find(i => i.productId === invItem.id);
      if (soldItem && invItem.type !== ProductType.SERVICE) {
        return { ...invItem, stock: Math.max(0, invItem.stock - soldItem.quantity) };
      }
      return invItem;
    });
    setInventory(updatedInventory);
  };

  const cartTotal = Math.round(cart.reduce((sum, item) => sum + item.priceAtSale * item.quantity, 0));

  const initiateTabCreation = (status: TabStatus) => {
    if (cart.length === 0) return;
    if (status === TabStatus.PAID) {
      setShowTransactionModal(true);
    } else {
      createTab(status);
    }
  };

  const updateRoomStatus = (roomNumber: string, status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE') => {
    setRooms(rooms.map((r: Room) => r.number === roomNumber ? { ...r, status } : r));
  };

  const createTab = (status: TabStatus = TabStatus.OPEN, mpesaPhone?: string) => {
    const finalCustomerName = selectedTable
      ? `Table ${selectedTable} - ${customerName || 'Guest'}`
      : customerName || 'Walk-in';

    const roomItems = cart.filter(item => {
      const invItem = inventory.find(i => i.id === item.productId);
      return invItem?.category === 'Rooms';
    });

    if (activeTabId) {
      const updatedTabs = tabs.map(t => {
        if (t.id === activeTabId) {
          return {
            ...t,
            customerName: finalCustomerName,
            items: cart,
            total: cartTotal,
            status: status === TabStatus.PAID ? TabStatus.PAID : t.status,
            mpesaPhone: mpesaPhone || t.mpesaPhone,
            paymentType: mpesaPhone ? 'M-Pesa' : status === TabStatus.PAID ? 'Cash' : t.paymentType,
            updatedAt: Date.now()
          };
        }
        return t;
      });
      setTabs(updatedTabs);

      if (status === TabStatus.PAID) {
        const tab = updatedTabs.find(t => t.id === activeTabId);
        if (tab) {
          deductStock(cart);
          handlePrint(tab);
          roomItems.forEach(ri => {
            const roomNum = ri.name.replace('Room ', '');
            updateRoomStatus(roomNum, 'AVAILABLE');
          });
        }
      } else {
        roomItems.forEach(ri => {
          const roomNum = ri.name.replace('Room ', '');
          updateRoomStatus(roomNum, 'OCCUPIED');
        });
      }

      addAuditLog(currentUser!, 'Tab Updated', `Updated tab for ${finalCustomerName}`);
    } else {
      const newTab: Tab = {
        id: crypto.randomUUID(),
        staffId: currentUser!.id,
        customerName: finalCustomerName,
        items: cart,
        total: cartTotal,
        status,
        mpesaPhone,
        paymentType: mpesaPhone ? 'M-Pesa' : status === TabStatus.PAID ? 'Cash' : undefined,
        isDebt: status === TabStatus.UNPAID,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTabs([newTab, ...tabs]);

      if (status === TabStatus.PAID) {
        deductStock(cart);
        handlePrint(newTab);
      } else {
        roomItems.forEach(ri => {
          const roomNum = ri.name.replace('Room ', '');
          updateRoomStatus(roomNum, 'OCCUPIED');
        });
      }

      addAuditLog(currentUser!, 'Tab Created', `Created ${status} tab for ${newTab.customerName}`);
    }

    setCart([]);
    setCustomerName('');
    setSelectedTable(null);
    setActiveTabId(null);
    setShowTransactionModal(false);
  };

  const manageTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const isOwnerOrSub = [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR].includes(
      String(currentUser?.role).toUpperCase() as UserRole
    );
    if (!isOwnerOrSub && tab.staffId !== currentUser?.id) {
      showAlert('Unauthorized', 'You can only edit your own sales sessions.');
      return;
    }

    setCart(tab.items);
    setCustomerName(tab.customerName);
    setActiveTabId(tab.id);
    setActiveTab('sales');
    addAuditLog(currentUser!, 'Manage Tab', `Resumed tab for ${tab.customerName}`);
  };

  const settleTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedTabs = tabs.map(t =>
      t.id === tabId
        ? { ...t, status: TabStatus.PAID, isDebt: false, updatedAt: Date.now() }
        : t
    );
    setTabs(updatedTabs);
    deductStock(tab.items);

    tab.items.forEach(item => {
      const invItem = inventory.find(i => i.id === item.productId);
      if (invItem?.category === 'Rooms') {
        const roomNum = item.name.replace('Room ', '');
        updateRoomStatus(roomNum, 'AVAILABLE');
      }
    });

    handlePrint(tab);
    addAuditLog(currentUser!, 'Debt Settled', `Marked tab #${tabId.slice(0, 8)} as Paid`);
  };

  const handleDeleteTab = (tabId: string, tabName: string) => {
    showConfirm(
      'Delete Tab',
      `Permanently delete the tab for "${tabName}"? This cannot be undone.`,
      () => {
        deleteTab(tabId);
        addAuditLog(currentUser!, 'Tab Deleted', `Deleted tab #${tabId.slice(0, 8)} — ${tabName}`);
      },
      'danger'
    );
  };

  const handlePrint = (tab: Tab) => {
    setPrintingTab(tab);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const printCurrentCart = () => {
    const tempTab: Tab = {
      id: activeTabId || 'DRAFT',
      staffId: currentUser!.id,
      customerName: customerName || 'Guest',
      items: cart,
      total: cartTotal,
      status: TabStatus.OPEN,
      isDebt: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    handlePrint(tempTab);
  };

  const handleCloseShift = () => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayTabs = tabs.filter(t => (t.createdAt || 0) >= today);
    const paidToday = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.PAID);
    const totalRevenue = paidToday.reduce((s, t) => s + t.total, 0);
    const openCount = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.OPEN).length;
    const debtTotal = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.UNPAID).reduce((s, t) => s + t.total, 0);

    addAuditLog(
      currentUser!,
      'Shift Closed',
      `Revenue: KES ${totalRevenue.toLocaleString()} | Transactions: ${paidToday.length} | Open: ${openCount} | Debts: KES ${debtTotal.toLocaleString()}${shiftNote ? ` | Note: ${shiftNote}` : ''}`
    );
    setShowShiftSummary(false);
    setShiftNote('');
    showAlert('Shift Closed', 'End-of-shift report has been logged to the audit trail.');
  };

  const handleStaffSave = async (updated: any) => {
    const pinHashed = await hashPin(updated.pin);
    const finalStaff = { ...updated, pin: pinHashed };

    if (editingStaff?.id === 'NEW') {
      const newStaff = { ...finalStaff, id: crypto.randomUUID() };
      setStaff([...staff, newStaff]);
      addAuditLog(currentUser!, 'Staff Added', `Added new staff: ${newStaff.name}`);
    } else {
      setStaff(staff.map(s => s.id === updated.id ? finalStaff : s));
      addAuditLog(currentUser!, 'Staff Updated', `Updated credentials for: ${updated.name}`);
    }
    setEditingStaff(null);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  // ── Conditional returns (all hooks are above) ───────────────────────────────

  if (isLoading) {
    return (
      <div className="h-screen themed-bg-primary flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-green/30 border-t-neon-green rounded-full animate-spin mb-4" />
        <p className="text-[10px] themed-text-dim uppercase tracking-[0.3em] font-black animate-pulse">
          Initial Syncing...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen themed-bg-primary flex flex-col items-center justify-center p-4 transition-colors duration-500">
        <div className="mb-8 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-neon-green rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.3)] mb-4"
          >
            <Zap size={32} className="text-black" />
          </motion.div>
          <h1 className="text-3xl font-black themed-text tracking-tighter">LIPS & SIPS</h1>
          <p className="text-[10px] text-neon-green font-mono uppercase tracking-[0.3em]">Premium Club Terminal</p>
        </div>
        <PinPad onSuccess={handleLogin} error={loginError} isOnline={isOnline} />
        
        {!isAuthenticated && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={loginWithGoogle}
            className="mt-6 px-6 py-3 bg-white/5 border themed-border rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all group"
          >
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-1">
              <svg viewBox="0 0 24 24" className="w-full h-full"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.102 6.612l4.164 3.153z"/><path fill="#34A853" d="M16.04 18.013c-1.09.693-2.459 1.096-4.04 1.096-3.132 0-5.834-2.128-6.78-5.074L1.056 17.169C3.103 21.245 7.259 24 12 24c3.055 0 5.79-.996 7.841-2.691l-3.801-3.296z"/><path fill="#4285F4" d="M19.841 21.309C22.423 19.173 24 16.14 24 12c0-.832-.074-1.636-.214-2.413l-11.786-.013v4.568h6.631c-.286 1.554-1.159 2.872-2.484 3.754l3.71 3.413z"/><path fill="#FBBC05" d="M5.26 14.035A7.03 7.03 0 0 1 4.909 12c0-.712.106-1.4.303-2.044L1.05 6.808A11.967 11.967 0 0 0 0 12c0 1.91.442 3.718 1.23 5.33l4.03-3.295z"/></svg>
            </div>
            <span className="text-[10px] themed-text font-black uppercase tracking-widest">Connect to Cloud Database</span>
          </motion.button>
        )}

        {isAuthenticated && (
          <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-neon-green/10 border border-neon-green/20 rounded-xl">
            <Check size={12} className="text-neon-green" />
            <span className="text-[9px] text-neon-green font-black uppercase tracking-widest">Cloud Sync Active</span>
          </div>
        )}

        <footer className="mt-12 text-[10px] themed-text-dim uppercase tracking-widest font-bold opacity-30">
          Powered by August Tech
        </footer>
      </div>
    );
  }

  // ── Derived values for shift summary ────────────────────────────────────────
  const isManagement = [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR].includes(
    String(currentUser.role).toUpperCase() as UserRole
  );
  const isOwnerOrAdmin = [UserRole.OWNER, UserRole.ADMIN].includes(
    String(currentUser.role).toUpperCase() as UserRole
  );
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayTabs = tabs.filter(t => (t.createdAt || 0) >= todayStart);
  const shiftRevenue = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.PAID).reduce((s, t) => s + t.total, 0);
  const shiftTransactions = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.PAID).length;
  const shiftOpenCount = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.OPEN).length;
  const shiftDebtTotal = todayTabs.filter(t => String(t.status).toUpperCase() === TabStatus.UNPAID).reduce((s, t) => s + t.total, 0);

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen themed-bg-primary flex flex-col md:flex-row overflow-hidden">

      {/* Mobile Top Bar */}
      <div className="md:hidden themed-bg-secondary border-b themed-border p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neon-green rounded-lg flex items-center justify-center shadow-lg">
            <Crown size={16} className="text-black" />
          </div>
          <h1 className="font-black text-sm tracking-tighter themed-text">LIPS & SIPS</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="p-2 themed-text-dim hover:text-red-500 transition-colors mr-2"
            title="Log Out"
          >
            <LogOut size={20} />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 themed-text-dim"
          >
            {isMobileMenuOpen
              ? <X size={20} />
              : <div className="space-y-1 w-5"><div className="h-0.5 bg-current rounded" /><div className="h-0.5 bg-current rounded" /><div className="h-0.5 bg-current rounded" /></div>
            }
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-0 z-40 md:relative md:flex w-full md:w-64 border-r themed-border themed-bg-secondary flex-col shrink-0 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full shadow-2xl md:shadow-none'}`}>
        <div className="p-6 border-b themed-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-green rounded-xl flex items-center justify-center shadow-[0_5px_15px_rgba(0,255,136,0.3)]">
              <Crown size={24} className="text-black" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter themed-text leading-none">LIPS & SIPS</h1>
            </div>
          </div>
          <button className="md:hidden themed-text-dim" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'dashboard'} icon={Settings} label="Dashboard" onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
          <NavItem active={activeTab === 'sales'} icon={ShoppingCart} label="Sales" onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }} />
          <NavItem active={activeTab === 'tabs'} icon={ClipboardList} label="Active Tabs" onClick={() => { setActiveTab('tabs'); setIsMobileMenuOpen(false); }} />

          {isManagement && (
            <>
              <NavItem active={activeTab === 'reports'} icon={TrendingUp} label="Reports" onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} />
              <NavItem active={activeTab === 'rooms'} icon={Package} label="Rooms" onClick={() => { setActiveTab('rooms'); setIsMobileMenuOpen(false); }} />
            </>
          )}

          {isManagement && (
            <>
              <div className="pt-4 pb-2 px-4">
                <span className="text-[9px] themed-text-dim uppercase tracking-[0.2em] font-black">Management</span>
              </div>
              <NavItem active={activeTab === 'debts'} icon={CreditCard} label="Unpaid Debts" onClick={() => { setActiveTab('debts'); setIsMobileMenuOpen(false); }} />
              <NavItem active={activeTab === 'inventory'} icon={Package} label="Inventory" onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} />
            </>
          )}

          {isOwnerOrAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <span className="text-[9px] themed-text-dim uppercase tracking-[0.2em] font-black">Administration</span>
              </div>
              <NavItem active={activeTab === 'staff'} icon={Users} label="Staff" onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }} />
              <NavItem active={activeTab === 'audit'} icon={History} label="Audit Trail" onClick={() => { setActiveTab('audit'); setIsMobileMenuOpen(false); }} />
            </>
          )}

          <div className="pt-4 pb-2 px-4">
            <span className="text-[9px] themed-text-dim uppercase tracking-[0.2em] font-black">Session</span>
          </div>
          {isOwnerOrAdmin && (
            <NavItem active={false} icon={FileText} label="Close Shift" onClick={() => { setShowShiftSummary(true); setIsMobileMenuOpen(false); }} />
          )}
          <NavItem active={false} icon={LogOut} label="Log Out" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} />
        </nav>

        <div className="p-4 border-t themed-border space-y-4">
          <div className="flex items-center justify-between gap-2 px-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-3 bg-black/5 rounded-xl themed-text-dim hover:text-neon-green transition-all border themed-border"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="flex items-center gap-2 min-w-0 flex-1 relative group/profile">
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0 border themed-border group-hover:border-neon-green/50 transition-colors">
                <UserIcon size={20} className="themed-text-dim group-hover:text-neon-green" />
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-xs font-black themed-text truncate leading-none mb-1">{currentUser.name}</p>
                <p className="text-[9px] themed-text-dim uppercase font-black tracking-widest">{currentUser.role}</p>
              </div>
              <button
                onClick={() => setEditingStaff(currentUser)}
                className="absolute -top-12 left-0 w-full py-2 bg-neon-green text-black text-[10px] font-black rounded-lg opacity-0 group-hover/profile:opacity-100 transition-all shadow-lg uppercase tracking-widest"
              >
                Settings
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/5 rounded-xl border themed-border">
              {isOnline
                ? <Wifi size={14} className="text-neon-green" />
                : <WifiOff size={14} className="text-red-500" />
              }
              <span className="text-[10px] themed-text font-black uppercase tracking-widest leading-none">
                {isOnline ? 'Cloud Sync' : 'Local Mode'}
              </span>
            </div>
            <span className="text-[8px] themed-text-dim opacity-30 uppercase tracking-[0.2em] font-black">Powered by August Tech</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        ref={scrollRef}
        className="flex-1 flex flex-col min-w-0 themed-bg-primary p-4 md:p-6 overflow-y-auto relative custom-scrollbar"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
              <Dashboard
                currentUser={currentUser}
                tabs={tabs}
                inventory={inventory}
                staff={staff}
                onNavigate={(target) => { setActiveTab(target); setIsMobileMenuOpen(false); }}
              />
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div key="sales" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="min-h-full flex flex-col lg:flex-row gap-6">
              <div className="flex-1 flex flex-col min-w-0 space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center justify-between w-full md:w-auto">
                    <div>
                      <h2 className="text-3xl font-black themed-text tracking-tighter">Orders</h2>
                      <p className="themed-text-dim text-xs font-medium">Select items to add to current session</p>
                    </div>
                    <button
                      onClick={() => {
                        document.getElementById('shopping-cart-sidebar')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="lg:hidden p-4 bg-neon-green text-black rounded-2xl shadow-[0_10px_20px_rgba(0,255,136,0.3)] flex items-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                    >
                      <ShoppingCart size={18} />
                      Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
                    </button>
                  </div>
                  <div className="relative group w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 themed-text-dim opacity-30 group-focus-within:text-neon-green group-focus-within:opacity-100 transition-all" size={18} />
                    <input
                      type="text"
                      placeholder="Search items"
                      className="w-full themed-bg-secondary border themed-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-neon-green/50 transition-all font-bold themed-text shadow-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-3 z-50 themed-bg-secondary border themed-border rounded-[2rem] shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar glass-panel">
                        {filteredInventory.length === 0 ? (
                          <div className="p-8 text-xs themed-text-dim text-center font-black uppercase tracking-widest">No matching items</div>
                        ) : (
                          filteredInventory.map(item => (
                            <button
                              key={item.id}
                              onClick={() => { addToCart(item); setSearchQuery(''); }}
                              className="w-full text-left p-4 hover:bg-neon-green/10 flex items-center justify-between group transition-colors border-b themed-border last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-black themed-text group-hover:text-neon-green truncate">{item.name}</p>
                                <p className="text-[9px] themed-text-dim uppercase font-black tracking-widest">{item.category}</p>
                              </div>
                              <span className="text-xs font-mono font-black text-neon-green ml-4">KES {item.price}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </header>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black themed-text-dim uppercase tracking-[0.3em] flex items-center gap-2">
                    <RotateCcw size={12} className="text-neon-green" />
                    Express Select
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {speedMenu.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="p-5 themed-bg-secondary border themed-border rounded-3xl flex flex-col items-center justify-center text-center gap-3 hover:border-neon-green/30 transition-all group active:scale-95 shadow-lg h-36 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:text-neon-green transition-colors">
                          <Zap size={40} />
                        </div>
                        <span className="text-[10px] themed-text-dim font-black font-mono group-hover:text-neon-green/60 uppercase">KES {item.price}</span>
                        <span className="text-sm font-black themed-text group-hover:text-neon-green leading-tight">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 space-y-6">
                  <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${!selectedCategory ? 'bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(0,255,136,0.3)]' : 'bg-black/5 themed-text-dim themed-border hover:bg-black/10'}`}
                    >
                      All Assets
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedCategory === cat ? 'bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(0,255,136,0.3)]' : 'bg-black/5 themed-text-dim themed-border hover:bg-black/10'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-2 custom-scrollbar">
                    {filteredInventory.map(item => (
                      <div
                        key={item.id}
                        className="p-5 themed-bg-secondary/50 border themed-border rounded-3xl flex items-center justify-between hover:themed-bg-secondary hover:border-neon-green/10 transition-all group"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-black themed-text truncate group-hover:text-neon-green transition-colors">{item.name}</p>
                          <p className="text-[9px] themed-text-dim uppercase font-black tracking-widest">STOCK: {item.stock}</p>
                          <p className="text-xs text-neon-green font-black mt-2">KES {item.price}</p>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-12 h-12 bg-black/5 hover:bg-neon-green hover:text-black themed-border border rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-sm"
                        >
                          <Plus size={24} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Sidebar */}
              <div id="shopping-cart-sidebar" className="w-full lg:w-96 shrink-0 flex flex-col themed-bg-secondary border themed-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-neon-green/30" />

                <header className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black themed-text flex items-center justify-between gap-2 overflow-hidden w-full">
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-2 bg-neon-green/10 rounded-lg">
                        <ShoppingCart size={20} className="text-neon-green" />
                      </div>
                      <span className="tracking-tighter">{activeTabId ? 'Edit Session' : 'Registry'}</span>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-[10px] text-red-500 hover:bg-red-500/10 px-2 py-1 rounded-md transition-all font-black uppercase tracking-widest flex items-center gap-1"
                      >
                        <X size={12} /> Clear
                      </button>
                    )}
                  </h3>
                </header>

                <div className="mb-10 space-y-6">
                  <div>
                    <label className="text-[9px] themed-text-dim uppercase font-black tracking-[0.3em] block mb-3">Service Location</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                        <button
                          key={num}
                          onClick={() => setSelectedTable(selectedTable === num ? null : num)}
                          className={`py-3 rounded-xl text-xs font-black transition-all border ${selectedTable === num ? 'bg-neon-green text-black border-neon-green shadow-lg' : 'bg-black/5 themed-text-dim themed-border hover:border-neon-green/30'}`}
                        >
                          T{num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] themed-text-dim uppercase font-black tracking-[0.3em] block mb-3">Client Reference</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={selectedTable ? 'e.g. VIP Group' : 'Search tab or enter name...'}
                      className="w-full bg-black/5 border themed-border rounded-2xl py-4 px-5 text-sm themed-text focus:outline-none focus:border-neon-green/40 transition-all font-black"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-8 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-10">
                      <div className="w-24 h-24 border-2 border-dashed themed-border rounded-full flex items-center justify-center mb-6">
                        <Plus size={40} className="themed-text" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest themed-text">Collection Empty</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div
                        key={item.productId}
                        onClick={() => !isManagement ? undefined : setOverrideItem(item)}
                        className={`flex items-center justify-between group p-3 rounded-2xl border border-transparent transition-all ${isManagement ? 'hover:bg-black/5 hover:border-black/5 cursor-pointer shadow-sm' : ''}`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="p-2 bg-neon-green/5 themed-text-dim rounded-lg text-[10px] font-black">{item.quantity}x</div>
                          <div className="min-w-0">
                            <p className="text-sm font-black themed-text truncate leading-none mb-1">{item.name}</p>
                            <p className="text-[9px] themed-text-dim uppercase tracking-widest font-black">KES {item.priceAtSale} Unit</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-neon-green">KES {item.priceAtSale * item.quantity}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.productId); }}
                            className="themed-text-dim opacity-20 hover:text-red-500 hover:opacity-100 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-8 border-t themed-border space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] themed-text-dim uppercase font-black tracking-[0.3em] mb-1">Subtotal Value</p>
                      <h4 className="text-4xl font-black themed-text tracking-tighter">KES {cartTotal.toLocaleString()}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => initiateTabCreation(TabStatus.PAID)}
                      disabled={cart.length === 0}
                      className="flex-1 py-5 bg-neon-green text-black rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_10px_20px_rgba(0,255,136,0.3)]"
                    >
                      <Check size={20} />
                      SETTLE
                    </button>
                    <button
                      onClick={() => initiateTabCreation(TabStatus.OPEN)}
                      disabled={cart.length === 0}
                      className="flex-1 py-5 bg-black/5 border themed-border themed-text rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-2 hover:bg-black/10 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                    >
                      <ClipboardList size={20} />
                      OPEN TAB
                    </button>
                  </div>

                  <button
                    onClick={() => initiateTabCreation(TabStatus.UNPAID)}
                    disabled={cart.length === 0}
                    className="w-full py-5 bg-red-500/5 border border-red-500/10 text-red-500/60 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500 active:scale-95 transition-all disabled:opacity-20"
                  >
                    <CreditCard size={20} />
                    LEDGER DEBT
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tabs' && (
            <motion.div key="tabs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col space-y-8">
              <header>
                <h2 className="text-3xl font-black themed-text tracking-tighter">Current Registry</h2>
                <p className="themed-text-dim text-xs font-medium">Manage and modify active guest sessions</p>
              </header>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.filter(t => String(t.status).toUpperCase() === TabStatus.OPEN).length === 0 ? (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center themed-bg-secondary border themed-border rounded-[2.5rem] opacity-20">
                    <ClipboardList size={48} className="themed-text mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest themed-text">No active sessions</p>
                  </div>
                ) : (
                  tabs.filter(t => String(t.status).toUpperCase() === TabStatus.OPEN).map(tab => (
                    <Fragment key={tab.id}>
                      <TabCard
                        tab={tab}
                        onStatusChange={() => manageTab(tab.id)}
                        onPrint={() => handlePrint(tab)}
                        onDelete={isOwnerOrAdmin ? () => handleDeleteTab(tab.id, tab.customerName) : undefined}
                        staffName={staff.find(s => s.id === tab.staffId)?.name || 'Unknown'}
                      />
                    </Fragment>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'debts' && (
            <motion.div key="debts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col space-y-8">
              <header>
                <h2 className="text-3xl font-black text-red-500 tracking-tighter">Debt Ledger</h2>
                <p className="themed-text-dim text-xs font-medium">Securing pending accounts and collections</p>
              </header>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.filter(t => String(t.status).toUpperCase() === TabStatus.UNPAID).length === 0 ? (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center themed-bg-secondary border themed-border rounded-[2.5rem] opacity-20">
                    <CreditCard size={48} className="themed-text mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest themed-text">Financial record clear</p>
                  </div>
                ) : (
                  tabs.filter(t => String(t.status).toUpperCase() === TabStatus.UNPAID).map(tab => (
                    <Fragment key={tab.id}>
                      <TabCard
                        tab={tab}
                        onStatusChange={() => settleTab(tab.id)}
                        onPrint={() => handlePrint(tab)}
                        onDelete={isOwnerOrAdmin ? () => handleDeleteTab(tab.id, tab.customerName) : undefined}
                        isDebt
                        staffName={staff.find(s => s.id === tab.staffId)?.name || 'Unknown'}
                      />
                    </Fragment>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col">
              <InventoryManager
                inventory={inventory}
                setInventory={setInventory}
                addAuditLog={addAuditLog}
                currentUser={currentUser}
                setEditingItem={setEditingItem}
                onConfirmDialog={showConfirm}
              />
            </motion.div>
          )}

          {activeTab === 'rooms' && (
            <motion.div key="rooms" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col space-y-8">
              <RoomManager
                rooms={rooms}
                setRooms={setRooms}
                tabs={tabs}
                onBillToRoom={(room: any) => {
                  addToCart({ id: room.id, name: `Room ${room.number}`, price: room.price, category: 'Rooms', stock: 1, isQuickSell: false, type: 'ROOM' } as any);
                  setCustomerName(prev => prev || `Room ${room.number}`);
                  setActiveTab('sales');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'staff' && (
            <motion.div key="staff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col">
              <StaffManager
                staff={staff}
                setStaff={setStaff}
                addAuditLog={addAuditLog}
                currentUser={currentUser}
                setEditingStaff={setEditingStaff}
                onConfirmDialog={showConfirm}
              />
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col">
              <AuditViewer logs={auditLogs} />
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col">
              <Reports tabs={tabs} inventory={inventory} staff={staff} />
            </motion.div>
          )}
        </AnimatePresence>

        {showTransactionModal && (
          <TransactionModal
            total={cartTotal}
            onConfirm={(phone) => createTab(TabStatus.PAID, phone)}
            onPrint={printCurrentCart}
            onCancel={() => setShowTransactionModal(false)}
          />
        )}

        {overrideItem && (
          <PriceOverrideModal
            item={overrideItem}
            onConfirm={(price) => handlePriceOverride(overrideItem.productId, price)}
            onCancel={() => setOverrideItem(null)}
          />
        )}

        {editingStaff && (
          <StaffEditModal
            staff={editingStaff}
            currentUser={currentUser}
            onConfirm={handleStaffSave}
            onCancel={() => setEditingStaff(null)}
          />
        )}

        {editingItem && (
          <InventoryEditModal
            item={editingItem}
            onConfirm={(updated: any) => {
              if (editingItem.id === 'NEW') {
                const newItem = { ...updated, id: crypto.randomUUID() };
                setInventory([...inventory, newItem]);
                addAuditLog(currentUser, 'Inventory Added', `Added new item: ${newItem.name}`);
              } else {
                setInventory(inventory.map(i => i.id === updated.id ? updated : i));
                addAuditLog(currentUser, 'Inventory Updated', `Updated item: ${updated.name}`);
              }
              setEditingItem(null);
            }}
            onCancel={() => setEditingItem(null)}
          />
        )}

        {/* Shift Close-Out Modal */}
        {showShiftSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md themed-bg-secondary border themed-border rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-neon-green/10 border border-neon-green/20 rounded-2xl flex items-center justify-center">
                  <FileText size={24} className="text-neon-green" />
                </div>
                <div>
                  <h3 className="text-xl font-black themed-text uppercase tracking-tight">Close Shift</h3>
                  <p className="text-[10px] themed-text-dim font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-neon-green/5 border border-neon-green/10 rounded-2xl">
                  <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Revenue</p>
                  <p className="text-xl font-black text-neon-green">KES {shiftRevenue.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-black/5 border themed-border rounded-2xl">
                  <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Transactions</p>
                  <p className="text-xl font-black themed-text">{shiftTransactions}</p>
                </div>
                <div className="p-4 bg-black/5 border themed-border rounded-2xl">
                  <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Open Tabs</p>
                  <p className="text-xl font-black themed-text">{shiftOpenCount}</p>
                </div>
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                  <p className="text-[9px] themed-text-dim font-black uppercase tracking-widest mb-1">Unpaid Debts</p>
                  <p className="text-xl font-black text-red-400">KES {shiftDebtTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="mb-8">
                <label className="text-[9px] themed-text-dim uppercase font-black tracking-[0.3em] block mb-3">Shift Notes (Optional)</label>
                <textarea
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="Any issues, incidents, or handover notes..."
                  rows={3}
                  className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-5 text-sm themed-text focus:outline-none focus:border-neon-green/40 transition-all font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setShowShiftSummary(false); setShiftNote(''); }}
                  className="py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseShift}
                  className="py-4 bg-neon-green text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,255,136,0.3)]"
                >
                  Log & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* Global scroll button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
            className="fixed bottom-8 right-8 z-[100] p-4 bg-neon-green text-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all animate-bounce print:hidden"
          >
            <ArrowDown size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {printingTab && (
        <Receipt
          tab={printingTab}
          staffName={staff.find(s => s.id === printingTab.staffId)?.name || 'Terminal'}
        />
      )}

      <ConfirmDialog dialog={dialog} onClose={closeDialog} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative border ${
        active
          ? 'bg-neon-green/10 themed-text border-neon-green/20 shadow-sm'
          : 'themed-text-dim border-transparent hover:themed-bg-secondary hover:themed-text'
      }`}
    >
      <Icon size={18} className={active ? 'text-neon-green drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]' : 'group-hover:text-neon-green/60'} />
      <span className="font-black text-[11px] uppercase tracking-widest">{label}</span>
    </button>
  );
}

function TabCard({ tab, onStatusChange, onPrint, onDelete, isDebt = false, staffName }: {
  tab: Tab;
  onStatusChange: () => void;
  onPrint: () => void;
  onDelete?: () => void;
  isDebt?: boolean;
  staffName: string;
}) {
  return (
    <div className="p-8 themed-bg-secondary border themed-border rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col gap-6">
      {onPrint && (
        <div className="absolute top-8 right-8 z-10 flex gap-2">
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-red-500/5 hover:bg-red-500/20 text-red-500/50 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-500/20"
              title="Delete Tab"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onPrint(); }}
            className="p-2 bg-black/5 hover:bg-neon-green/20 hover:text-neon-green themed-text-dim rounded-xl transition-all border themed-border print:hidden"
            title="Print Receipt"
          >
            <Printer size={16} />
          </button>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between mb-6">
          <div className="min-w-0 pr-20">
            <p className="text-[9px] themed-text-dim uppercase font-black tracking-[0.2em] mb-1">Holder</p>
            <h4 className="text-xl font-black themed-text truncate leading-tight">{tab.customerName}</h4>
            <p className="text-[10px] themed-text-dim font-bold mt-1">Served by: <span className="themed-text">{staffName}</span></p>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black shadow-sm ${isDebt ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-neon-green/10 text-neon-green border border-neon-green/20'} uppercase tracking-widest`}>
            {tab.status}
          </div>
        </div>

        <div className="space-y-2.5 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
          {tab.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-[11px] font-medium tracking-tight">
              <span className="themed-text-dim">{item.quantity}× {item.name}</span>
              <span className="themed-text font-black">KES {(item.priceAtSale * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t themed-border">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[9px] themed-text-dim uppercase font-black tracking-[0.2em] mb-1">Account Total</p>
            <p className="text-2xl font-black themed-text tracking-tighter leading-none">KES {tab.total.toLocaleString()}</p>
          </div>
          <p className="text-[8px] themed-text-dim font-black uppercase opacity-20">ID REF: {tab.id.slice(0, 8)}</p>
        </div>
        <button
          onClick={onStatusChange}
          className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg ${isDebt ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-black/5 themed-text themed-border hover:bg-black/10'}`}
        >
          {isDebt ? 'Settle Balance' : 'Modify Registry'}
        </button>
      </div>
    </div>
  );
}

function PriceOverrideModal({ item, onConfirm, onCancel }: { item: TabItem; onConfirm: (price: number) => void; onCancel: () => void }) {
  const [newPrice, setNewPrice] = useState(item.priceAtSale.toString());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm themed-bg-secondary border themed-border rounded-[2.5rem] p-10 shadow-2xl">
        <h3 className="text-2xl font-black themed-text mb-2 tracking-tighter">Price Adjustment</h3>
        <p className="themed-text-dim text-[10px] mb-8 font-black uppercase tracking-widest">Applying to: {item.name}</p>

        <div className="mb-10">
          <label className="text-[9px] themed-text-dim uppercase font-black tracking-[0.3em] block mb-3 font-mono">One-Time Sale Price (KES)</label>
          <input
            type="number"
            autoFocus
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full themed-bg-primary border themed-border rounded-2xl py-5 px-6 text-2xl text-neon-green focus:outline-none focus:border-neon-green transition-all font-mono font-black"
          />
        </div>

        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all">ABORT</button>
          <button onClick={() => onConfirm(Math.round(Number(newPrice)))} className="flex-1 py-4 bg-neon-green text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[0_10px_20px_rgba(0,255,136,0.3)]">AUTHORIZE</button>
        </div>
      </div>
    </div>
  );
}

function InventoryManager({ inventory, setInventory, addAuditLog, currentUser, setEditingItem, onConfirmDialog }: any) {
  const deleteItem = (id: string) => {
    const item = inventory.find((i: Product) => i.id === id);
    onConfirmDialog(
      'Delete Item',
      `Permanently delete "${item?.name}" from inventory?`,
      () => {
        setInventory(inventory.filter((i: Product) => i.id !== id));
        addAuditLog(currentUser, 'Inventory Delete', `Deleted item: ${item?.name}`);
      },
      'danger'
    );
  };

  const adjustStock = (id: string, delta: number) => {
    const updated = inventory.map((i: Product) => {
      if (i.id === id) {
        const newStock = Math.max(0, i.stock + delta);
        addAuditLog(currentUser, 'Stock Adjustment', `Adjusted ${i.name} stock to ${newStock}`);
        return { ...i, stock: newStock };
      }
      return i;
    });
    setInventory(updated);
  };

  const toggleQuickSell = (id: string) => {
    const updated = inventory.map((i: Product) => {
      if (i.id === id) {
        addAuditLog(currentUser, 'Inventory Update', `Toggled Quick-Sell for ${i.name}`);
        return { ...i, isQuickSell: !i.isQuickSell };
      }
      return i;
    });
    setInventory(updated);
  };

  const lowStockCount = inventory.filter((i: Product) => i.stock < 10 && i.type !== ProductType.SERVICE).length;

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black themed-text tracking-tighter">Inventory Management</h2>
          <p className="themed-text-dim text-sm font-medium mt-1">Real-time stock monitoring and replenishment</p>
        </div>
        <div className="flex items-center gap-4">
          {lowStockCount > 0 && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
              <Zap size={16} className="text-red-500" />
              <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">{lowStockCount} Items Low Stock</span>
            </div>
          )}
          <button
            onClick={() => setEditingItem({ id: 'NEW', name: '', category: '', price: 0, stock: 0, isQuickSell: false, type: 'DRINK' })}
            className="bg-neon-green text-black px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-[0_10px_20px_rgba(0,255,136,0.3)]"
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
      </header>

      <div className="luxury-card overflow-hidden flex-1 flex flex-col themed-bg-secondary border themed-border">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b themed-border text-[10px] themed-text-dim uppercase tracking-[0.2em] font-black bg-black/5">
                <th className="py-6 px-8">Product Details</th>
                <th className="py-6">Category</th>
                <th className="py-6">Price</th>
                <th className="py-6 min-w-[150px]">Current Stock</th>
                <th className="py-6 text-center">Quick Sell</th>
                <th className="py-6 px-8 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y themed-border">
              {inventory.map((item: Product) => (
                <tr key={item.id} className={`hover:bg-black/5 transition-colors group ${item.stock < 10 && item.type !== ProductType.SERVICE ? 'bg-red-500/[0.02]' : ''}`}>
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${item.stock < 10 && item.type !== ProductType.SERVICE ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-neon-green'}`} />
                      <div>
                        <p className="font-black themed-text text-lg leading-tight">{item.name}</p>
                        <p className="text-[9px] themed-text-dim uppercase font-black tracking-widest mt-1 opacity-50">SKU: {item.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6">
                    <span className="px-3 py-1 bg-black/5 border themed-border rounded-lg text-[9px] font-black themed-text-dim uppercase tracking-widest">{item.category}</span>
                  </td>
                  <td className="py-6 font-mono font-black text-neon-green">
                    <button onClick={() => setEditingItem(item)} className="hover:bg-neon-green/10 px-3 py-1 rounded-lg transition-all" title="Click to edit price">
                      KES {item.price.toLocaleString()}
                    </button>
                  </td>
                  <td className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-black/5 rounded-xl border themed-border overflow-hidden">
                        <button onClick={() => adjustStock(item.id, -1)} className="p-2 hover:bg-red-500/20 hover:text-red-500 themed-text-dim transition-colors border-r themed-border">
                          <X size={14} className="rotate-45" />
                        </button>
                        <span className={`px-4 font-mono font-black text-sm ${item.stock < 10 && item.type !== ProductType.SERVICE ? 'text-red-500' : 'themed-text'}`}>{item.stock}</span>
                        <button onClick={() => adjustStock(item.id, 1)} className="p-2 hover:bg-neon-green/20 hover:text-neon-green themed-text-dim transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      {item.stock < 10 && item.type !== ProductType.SERVICE && (
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Running Low</span>
                      )}
                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleQuickSell(item.id)}
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-all border ${item.isQuickSell ? 'bg-neon-green border-neon-green' : 'bg-black/10 border-white/5'}`}
                      >
                        <motion.div animate={{ x: item.isQuickSell ? 16 : 0 }} className={`w-4 h-4 rounded-full shadow-lg ${item.isQuickSell ? 'bg-black' : 'bg-white/40'}`} />
                      </button>
                    </div>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setEditingItem(item)} className="p-3 bg-black/5 border themed-border rounded-2xl themed-text-dim hover:text-neon-green hover:border-neon-green/20 transition-all" title="Edit Item">
                        <Settings size={18} />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-3 bg-red-500/5 border border-transparent hover:border-red-500/20 rounded-2xl text-red-500/50 hover:text-red-500 transition-all" title="Delete Item">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-black/5 border-t themed-border flex justify-between items-center">
          <span className="text-[9px] themed-text-dim font-black uppercase tracking-[0.2em]">Total Inventory Count: {inventory.length} SKUs</span>
          {lowStockCount > 0 && <span className="text-[9px] text-red-500 font-black uppercase tracking-[0.2em]">{lowStockCount} Warnings active</span>}
        </div>
      </div>
    </div>
  );
}

function InventoryEditModal({ item, onConfirm, onCancel }: { item: any; onConfirm: (updated: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    ...item,
    price: item.price === 0 ? '' : item.price,
    stock: item.stock === 0 ? '' : item.stock
  });

  const handleConfirm = () => {
    onConfirm({
      ...formData,
      price: Math.round(Number(formData.price || 0)),
      stock: Number(formData.stock || 0)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md themed-bg-secondary border themed-border rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-2xl font-black themed-text mb-2">{item.id === 'NEW' ? 'New Inventory Item' : 'Edit Item'}</h3>
        <p className="themed-text-dim text-sm mb-8 font-medium uppercase tracking-[0.2em]">Management Protocol</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Item Name</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold" placeholder="e.g. Tusker Cider" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Category</label>
              <input type="text" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold" placeholder="e.g. Beer" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold appearance-none">
                <option value="DRINK">Drink</option>
                <option value="FOOD">Food</option>
                <option value="ROOM">Room</option>
                <option value="SERVICE">Service (Carwash)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Price (KES)</label>
              <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold" placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Stock Level</label>
              <input type="number" required value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold" placeholder="0" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10">
          <button onClick={onCancel} className="py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all font-mono">DISCARD</button>
          <button onClick={handleConfirm} disabled={!formData.name || !formData.category} className="py-4 bg-neon-green text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 shadow-[0_10px_20px_rgba(0,255,136,0.3)]">CONFIRM</button>
        </div>
      </div>
    </div>
  );
}

function RoomManager({ rooms, setRooms, tabs, onBillToRoom }: any) {
  const [editingRoom, setEditingRoom] = useState<any | null>(null);

  const getActiveTabForRoom = (roomNum: string) => {
    return tabs.find((t: any) =>
      (t.customerName.includes(`Room ${roomNum}`) || t.items.some((i: any) => i.name === `Room ${roomNum}`)) &&
      String(t.status).toUpperCase() === TabStatus.OPEN
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black themed-text tracking-tighter">Room Directory</h2>
          <p className="themed-text-dim text-sm">Accommodation management and charging</p>
        </div>
        <button
          onClick={() => setEditingRoom({ id: 'NEW', number: '', type: 'Standard', price: 3500, status: 'AVAILABLE' })}
          className="bg-neon-green text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
        >
          <Plus size={18} /> Add Room
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {rooms.map((room: any) => {
          const activeTab = getActiveTabForRoom(room.number);
          return (
            <div key={room.id} className="p-8 themed-bg-secondary border themed-border rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] themed-text-dim uppercase font-black tracking-widest mb-1">Room {room.type}</p>
                  <h4 className="text-4xl font-black themed-text tracking-tighter">{room.number}</h4>
                </div>
                <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${room.status === 'AVAILABLE' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {room.status}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-xs">
                  <span className="themed-text-dim font-bold uppercase tracking-widest">Base Rate</span>
                  <span className="themed-text font-black">KES {room.price.toLocaleString()}</span>
                </div>
                {activeTab && (
                  <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                    <p className="text-[9px] text-orange-500 uppercase font-black tracking-wider mb-1">Pending Bill</p>
                    <p className="text-lg font-black themed-text leading-tight">KES {activeTab.total.toLocaleString()}</p>
                    <p className="text-[9px] themed-text-dim mt-1 truncate">Current Tab: {activeTab.id.slice(0, 8)}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => onBillToRoom(room)} className="flex-1 py-4 bg-neon-green text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md">
                  Bill Room
                </button>
                <button onClick={() => setEditingRoom(room)} className="p-4 bg-black/5 themed-text-dim border themed-border rounded-2xl hover:bg-black/10 transition-all">
                  <Settings size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md themed-bg-secondary border themed-border rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-black themed-text mb-2">{editingRoom.id === 'NEW' ? 'New Room Registry' : 'Edit Room'}</h3>
            <div className="space-y-4 mt-6">
              <input value={editingRoom.number} onChange={e => setEditingRoom({ ...editingRoom, number: e.target.value })} placeholder="Room Number" className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text font-bold" />
              <input value={editingRoom.type} onChange={e => setEditingRoom({ ...editingRoom, type: e.target.value })} placeholder="Room Type (e.g. Deluxe)" className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text font-bold" />
              <input type="number" value={editingRoom.price || ''} onChange={e => setEditingRoom({ ...editingRoom, price: e.target.value })} placeholder="Nightly Rate" className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text font-bold" />
              <select value={editingRoom.status} onChange={e => setEditingRoom({ ...editingRoom, status: e.target.value })} className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text font-bold appearance-none">
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={() => setEditingRoom(null)} className="py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase">Discard</button>
              <button
                onClick={() => {
                  const finalRoom = { ...editingRoom, price: Math.round(Number(editingRoom.price || 0)) };
                  if (editingRoom.id === 'NEW') setRooms([...rooms, { ...finalRoom, id: crypto.randomUUID() }]);
                  else setRooms(rooms.map((r: any) => r.id === editingRoom.id ? finalRoom : r));
                  setEditingRoom(null);
                }}
                className="py-4 bg-neon-green text-black rounded-2xl font-black text-xs uppercase shadow-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffManager({ staff, setStaff, addAuditLog, currentUser, setEditingStaff, onConfirmDialog }: any) {
  const revokeAccess = (id: string) => {
    const staffMember = staff.find((s: any) => s.id === id);
    if (staffMember?.id === currentUser.id) return;
    onConfirmDialog(
      'Revoke Access',
      `Remove "${staffMember?.name}" from the system? This cannot be undone.`,
      () => {
        setStaff(staff.filter((s: any) => s.id !== id));
        addAuditLog(currentUser, 'Access Revoked', `Revoked access for ${staffMember?.name}`);
      },
      'danger'
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black themed-text tracking-tighter">Staff Roster</h2>
          <p className="themed-text-dim text-sm">Security clearance and PIN management</p>
        </div>
        <button
          onClick={() => setEditingStaff({ id: 'NEW', name: '', pin: '', role: UserRole.STAFF })}
          className="bg-neon-green text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={20} /> ADD NEW
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((u: User) => (
          <div key={u.id} className="p-6 themed-bg-secondary border themed-border rounded-3xl group relative overflow-hidden transition-all hover:border-black/10 shadow-lg">
            <div className={`absolute top-0 right-0 p-3 text-[10px] font-black uppercase tracking-widest ${String(u.role).toUpperCase() === UserRole.OWNER ? 'bg-neon-green text-black' : 'bg-black/5 themed-text-dim'}`}>
              {u.role}
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center themed-border border">
                <UserIcon className="themed-text-dim" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-black themed-text truncate">{u.name}</h4>
                <p className="text-xs themed-text-dim truncate">Employee ID: {u.id.slice(0, 8)}</p>
              </div>
            </div>

            <div className="bg-black/5 rounded-xl p-4 flex items-center justify-between border themed-border">
              <div>
                <p className="text-[10px] themed-text-dim uppercase font-black">Assigned PIN</p>
                <p className="text-lg font-mono font-black tracking-widest text-neon-green">****</p>
              </div>
              <button onClick={() => setEditingStaff(u)} className="text-xs font-black themed-text-dim hover:text-neon-green transition-colors flex items-center gap-2">
                <Settings size={14} /> EDIT
              </button>
            </div>

            {u.id !== currentUser.id && (
              <button
                onClick={() => revokeAccess(u.id)}
                className="mt-6 w-full py-3 text-red-500 opacity-40 hover:opacity-100 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all text-sm font-black md:opacity-0 group-hover:opacity-100"
              >
                REVOKE ACCESS
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffEditModal({ staff, onConfirm, onCancel, currentUser }: { staff: any; onConfirm: (updated: any) => void; onCancel: () => void; currentUser: User }) {
  const [formData, setFormData] = useState({ ...staff, pin: '' });
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md themed-bg-secondary border themed-border rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-2xl font-black themed-text mb-2">{staff.id === 'NEW' ? 'Register New Staff' : 'Modify Credentials'}</h3>
        <p className="themed-text-dim text-sm mb-8 font-medium uppercase tracking-[0.2em]">Lips & Sips Security Protocol</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Full Legal Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold"
              placeholder="e.g. John Smith"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">Permission Tier</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 themed-text focus:outline-none focus:border-neon-green transition-all font-bold appearance-none"
            >
              <option value={UserRole.STAFF}>Service Staff</option>
              <option value={UserRole.SUPERVISOR}>Supervisor</option>
              <option value={UserRole.ADMIN}>Admin</option>
              {(String(formData.role).toUpperCase() === UserRole.OWNER || String(currentUser.role).toUpperCase() === UserRole.OWNER) && (
                <option value={UserRole.OWNER}>System Owner</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] themed-text-dim uppercase font-black tracking-widest block font-mono">
              Security PIN (4 Digits){staff.id !== 'NEW' && <span className="text-neon-green/50 ml-2">— leave blank to keep current</span>}
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                className="w-full themed-bg-primary border themed-border rounded-2xl py-4 px-6 text-2xl text-neon-green focus:outline-none focus:border-neon-green transition-all font-mono font-black tracking-[1em]"
                placeholder={staff.id === 'NEW' ? '0000' : '••••'}
              />
              <button onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 themed-text-dim hover:themed-text transition-all">
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10">
          <button onClick={onCancel} className="py-4 bg-black/5 themed-text-dim border themed-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all font-mono">DISCARD</button>
          <button
            onClick={() => onConfirm(formData)}
            disabled={!formData.name || (staff.id === 'NEW' && formData.pin.length !== 4)}
            className="py-4 bg-neon-green text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_10px_20px_rgba(0,255,136,0.3)]"
          >
            AUTHORIZE
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditViewer({ logs }: { logs: any[] }) {
  const actionColor = (action: string) => {
    if (action.includes('Login') || action.includes('Logout')) return 'bg-blue-400';
    if (action.includes('Delete') || action.includes('Revoke') || action.includes('Cancel')) return 'bg-red-500';
    if (action.includes('Settled') || action.includes('Paid') || action.includes('Closed')) return 'bg-neon-green';
    return 'bg-neon-green/50';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header>
        <h2 className="text-2xl font-black themed-text tracking-tighter">System Audit</h2>
        <p className="themed-text-dim text-sm">Immutable log of all critical actions</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {logs.map(log => (
          <div key={log.id} className="p-4 themed-bg-secondary border themed-border rounded-2xl flex items-center justify-between gap-6 hover:border-neon-green/20 transition-all shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full shrink-0 ${actionColor(log.action)}`} />
              <div>
                <p className="text-sm font-black themed-text">{log.action}</p>
                <p className="text-xs themed-text-dim">{log.details}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] themed-text font-black uppercase tracking-wider">{log.userName}</p>
              <p className="text-[10px] themed-text-dim font-mono">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="h-48 flex items-center justify-center opacity-20">
            <p className="text-sm font-black uppercase tracking-widest themed-text">No audit events yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
