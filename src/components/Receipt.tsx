/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tab, TabItem } from '../types';

interface ReceiptProps {
  tab: Tab;
  staffName: string;
}

export const Receipt: React.FC<ReceiptProps> = ({ tab, staffName }) => {
  const dateStr = new Date(tab.updatedAt || tab.createdAt).toLocaleString();

  return (
    <div id="receipt-print" className="hidden print:block w-[80mm] p-4 font-mono text-[10px] bg-white text-black leading-tight">
      <div className="text-center mb-4">
        <h1 className="text-sm font-black uppercase tracking-tighter">LIPS & SIPS</h1>
        <p className="text-[8px] uppercase tracking-widest">Premium Club Terminal</p>
        <p className="mt-1">--------------------------------</p>
      </div>

      <div className="mb-4">
        <div className="flex justify-between">
          <span>DATE:</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span>REF:</span>
          <span>#{tab.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span>STAFF:</span>
          <span>{staffName.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>CLIENT:</span>
          <span>{tab.customerName.toUpperCase()}</span>
        </div>
        <p className="mt-2">--------------------------------</p>
      </div>

      <div className="mb-4">
        <div className="flex justify-between font-black mb-1">
          <span className="w-12 text-left">QTY</span>
          <span className="flex-1 text-left">ITEM</span>
          <span className="w-16 text-right">TOTAL</span>
        </div>
        {tab.items.map((item: TabItem, idx: number) => (
          <div key={idx} className="flex justify-between items-start mb-1">
            <span className="w-12 text-left">{item.quantity}x</span>
            <span className="flex-1 text-left">{item.name}</span>
            <span className="w-16 text-right">{item.priceAtSale * item.quantity}</span>
          </div>
        ))}
        <p className="mt-2">--------------------------------</p>
      </div>

      <div className="mb-6 space-y-1">
        <div className="flex justify-between text-xs font-black">
          <span>TOTAL KES:</span>
          <span>{tab.total.toLocaleString()}</span>
        </div>
        {tab.paymentType && (
          <div className="flex justify-between">
            <span>METHOD:</span>
            <span>{tab.paymentType.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="text-center mt-10">
        <p className="mb-1 italic">Thank you for your patronage!</p>
        <p className="text-[8px] opacity-50 uppercase tracking-widest">Powered by August Tech</p>
        <div className="mt-4 flex justify-center">
            {/* Mock QR placeholder */}
            <div className="w-16 h-16 border border-black flex items-center justify-center p-1">
                <div className="w-full h-full bg-black/10 flex items-center justify-center text-[6px]">DIGITAL AUTH</div>
            </div>
        </div>
      </div>
    </div>
  );
};
