import { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, InventoryItem, Tab, AuditLog, TabStatus, ProductType, Room } from '../types';

// Helper to remove undefined fields recursively
function cleanData(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(cleanData);
  
  const clean: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined) {
      clean[key] = cleanData(value);
    }
  });
  return clean;
}

export interface POSData {
  staff: User[];
  setStaff: (staff: User[]) => Promise<void>;
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => Promise<void>;
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => Promise<void>;
  deleteTab: (tabId: string) => Promise<void>;
  rooms: Room[];
  setRooms: (rooms: Room[]) => Promise<void>;
  auditLogs: AuditLog[];
  addAuditLog: (user: User, action: string, details: string) => Promise<void>;
  isOnline: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  isAuthenticated: boolean;
}

const LS = {
  get: <T>(key: string, fallback: T): T => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full */ }
  },
};

const DEFAULT_STAFF: User[] = [
  { id: 'default-1', name: 'James Barman', pin: '1111', role: 'STAFF' as any },
  { id: 'default-2', name: 'Owner', pin: '1234', role: 'OWNER' as any },
  { id: 'default-3', name: 'Supervisor Sarah', pin: '5555', role: 'SUPERVISOR' as any },
];

export function usePOSData(): POSData {
  const [staff, setStaffState] = useState<User[]>(() => LS.get('ls_staff', DEFAULT_STAFF));
  const [inventory, setInventoryState] = useState<InventoryItem[]>(() => LS.get('ls_inventory', []));
  const [tabs, setTabsState] = useState<Tab[]>(() => LS.get('ls_tabs', []));
  const [rooms, setRoomsState] = useState<Room[]>(() => LS.get('ls_rooms', []));
  const [auditLogs, setAuditLogsState] = useState<AuditLog[]>(() => LS.get('ls_auditLogs', []));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const loadingDoneRef = useRef(false);

  const finishLoading = () => {
    if (!loadingDoneRef.current) {
      loadingDoneRef.current = true;
      setIsLoading(false);
    }
  };

  const tabsRef = useRef<Tab[]>([]);
  tabsRef.current = tabs;

  // 1. Handle Authentication STATE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        finishLoading();
      } else {
        setIsAuthenticated(false);
        // We don't force login here, just show local state
        finishLoading();
      }
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  // 2. Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data() as User);
        if (docs.length > 0) {
          setStaffState(docs);
          LS.set('ls_staff', docs);
        } else {
          // Firestore empty — seed initial staff
          const initialStaff: User[] = [
            { id: '1', name: 'James Barman', pin: '1111', role: 'STAFF' as any },
            { id: '2', name: 'Owner', pin: '1234', role: 'OWNER' as any },
            { id: '3', name: 'Supervisor Sarah', pin: '5555', role: 'SUPERVISOR' as any },
          ];
          initialStaff.forEach(s => setDoc(doc(db, 'staff', s.id), s));
        }
        finishLoading();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'staff');
        // Keep localStorage-seeded state; just unblock loading
        finishLoading();
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data() as InventoryItem);
        if (docs.length > 0) {
          setInventoryState(docs);
          LS.set('ls_inventory', docs);
        } else {
          const initialInventory: InventoryItem[] = [
            { id: 'i1', name: 'Hennessy VS 750ml', price: 8500, stock: 24, category: 'Bottles', isQuickSell: true, type: ProductType.DRINK },
            { id: 'i2', name: 'Tusker Lager', price: 400, stock: 120, category: 'Beers', isQuickSell: true, type: ProductType.DRINK },
            { id: 'f1', name: 'Mbuzi Choma (1KG)', price: 1800, stock: 30, category: 'Food', isQuickSell: true, type: ProductType.FOOD },
            { id: 'cw1', name: 'Body Wash (Small)', price: 400, stock: 999, category: 'Carwash', isQuickSell: true, type: ProductType.SERVICE },
          ];
          initialInventory.forEach(item => setDoc(doc(db, 'inventory', item.id), item));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'inventory')
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, 'tabs'), orderBy('updatedAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data() as Tab);
        setTabsState(docs);
        LS.set('ls_tabs', docs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'tabs')
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data() as Room);
        if (docs.length > 0) {
          setRoomsState(docs);
          LS.set('ls_rooms', docs);
        } else {
          const initialRooms: Room[] = [
            { id: 'r1', number: '101', type: 'Standard', price: 3500, status: 'AVAILABLE' as any },
            { id: 'r2', number: '102', type: 'Standard', price: 3500, status: 'AVAILABLE' as any },
            { id: 'r3', number: '103', type: 'Deluxe', price: 5500, status: 'AVAILABLE' as any },
          ];
          initialRooms.forEach(r => setDoc(doc(db, 'rooms', r.id), r));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'rooms')
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data() as AuditLog);
        setAuditLogsState(docs);
        LS.set('ls_auditLogs', docs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs')
    );
    return unsubscribe;
  }, []);

  const setStaff = async (newStaff: User[]) => {
    setStaffState(newStaff);
    LS.set('ls_staff', newStaff);
    
    if (!isAuthenticated) return;
    
    for (const s of newStaff) {
      try {
        await setDoc(doc(db, 'staff', s.id), cleanData(s));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `staff/${s.id}`);
      }
    }
    const existingIds = staff.map(s => s.id);
    const newIds = newStaff.map(s => s.id);
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    for (const id of toDelete) {
      try {
        await deleteDoc(doc(db, 'staff', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `staff/${id}`);
      }
    }
  };

  const setInventory = async (newInventory: InventoryItem[]) => {
    setInventoryState(newInventory);
    LS.set('ls_inventory', newInventory);
    
    if (!isAuthenticated) return;
    
    for (const item of newInventory) {
      try {
        await setDoc(doc(db, 'inventory', item.id), cleanData(item));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${item.id}`);
      }
    }
    const existingIds = inventory.map(i => i.id);
    const newIds = newInventory.map(i => i.id);
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    for (const id of toDelete) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
      }
    }
  };

  const setTabs = async (newTabs: Tab[]) => {
    setTabsState(newTabs);
    LS.set('ls_tabs', newTabs);
    
    if (!isAuthenticated) return;
    
    const currentTabMap = new Map<string, Tab>(tabsRef.current.map(t => [t.id, t] as [string, Tab]));
    for (const tab of newTabs) {
      const existing = currentTabMap.get(tab.id);
      if (!existing || existing.updatedAt !== tab.updatedAt || existing.status !== tab.status) {
        try {
          await setDoc(doc(db, 'tabs', tab.id), cleanData(tab));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tabs/${tab.id}`);
        }
      }
    }
  };

  const deleteTab = async (tabId: string) => {
    try {
      await deleteDoc(doc(db, 'tabs', tabId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tabs/${tabId}`);
    }
  };

  const setRooms = async (newRooms: Room[]) => {
    setRoomsState(newRooms);
    LS.set('ls_rooms', newRooms);
    
    if (!isAuthenticated) return;
    
    for (const r of newRooms) {
      try {
        await setDoc(doc(db, 'rooms', r.id), cleanData(r));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `rooms/${r.id}`);
      }
    }
  };

  const addAuditLog = async (user: User, action: string, details: string) => {
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      userName: user.name,
      userId: user.id,
      action,
      details,
      timestamp: Date.now(),
    };
    
    setAuditLogsState([newLog, ...auditLogs]);
    LS.set('ls_auditLogs', [newLog, ...auditLogs]);
    
    if (!isAuthenticated) return;
    
    try {
      await setDoc(doc(db, 'auditLogs', newLog.id), cleanData(newLog));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `auditLogs/${newLog.id}`);
    }
  };

  return {
    staff, setStaff,
    inventory, setInventory,
    tabs, setTabs, deleteTab,
    rooms, setRooms,
    auditLogs, addAuditLog,
    isOnline,
    isLoading,
    loginWithGoogle,
    isAuthenticated
  };
}
