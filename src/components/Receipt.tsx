import React from 'react';
import { Tab, TabItem } from '../types';

interface ReceiptProps {
  tab: Tab;
  staffName: string;
}

export const Receipt: React.FC<ReceiptProps> = ({ tab, staffName }) => {
  const date = new Date(tab.updatedAt || tab.createdAt);
  const dateStr = date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
  const subtotal = tab.items.reduce((sum: number, item: TabItem) => sum + item.priceAtSale * item.quantity, 0);

  return (
    <div
      className="print:block hidden"
      style={{
        width: '80mm',
        margin: '0 auto',
        padding: '6mm 4mm',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '10px',
        lineHeight: '1.5',
        color: '#000',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
          LIPS &amp; SIPS
        </div>
        <div style={{ fontSize: '8px', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '1mm' }}>
          Premium Club Terminal
        </div>
        <div style={{ fontSize: '8px', marginTop: '1mm', opacity: 0.6 }}>
          Nairobi, Kenya
        </div>
        <div style={{ borderTop: '1px dashed #000', marginTop: '4mm' }} />
      </div>

      {/* Transaction details */}
      <div style={{ marginBottom: '4mm' }}>
        <Row label="DATE" value={dateStr} />
        <Row label="TIME" value={timeStr} />
        <Row label="REF #" value={tab.id.slice(0, 8).toUpperCase()} />
        <Row label="SERVED BY" value={staffName.toUpperCase()} />
        <Row label="CLIENT" value={tab.customerName.toUpperCase()} />
        {tab.paymentType && <Row label="PAYMENT" value={tab.paymentType.toUpperCase()} />}
        {tab.mpesaPhone && <Row label="M-PESA" value={tab.mpesaPhone} />}
      </div>

      <div style={{ borderTop: '1px dashed #000', marginBottom: '4mm' }} />

      {/* Items */}
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2mm', fontSize: '9px' }}>
          <span style={{ width: '10mm' }}>QTY</span>
          <span style={{ flex: 1 }}>ITEM</span>
          <span style={{ width: '18mm', textAlign: 'right' }}>KES</span>
        </div>
        {tab.items.map((item: TabItem, idx: number) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
            <span style={{ width: '10mm' }}>{item.quantity}x</span>
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ width: '18mm', textAlign: 'right' }}>
              {(item.priceAtSale * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #000', marginBottom: '4mm' }} />

      {/* Totals */}
      <div style={{ marginBottom: '6mm' }}>
        <Row label="SUBTOTAL" value={`KES ${subtotal.toLocaleString()}`} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '13px', marginTop: '2mm' }}>
          <span>TOTAL</span>
          <span>KES {tab.total.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', marginBottom: '6mm' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', marginBottom: '2mm' }}>
          WELCOME AGAIN!
        </div>
        <div style={{ fontSize: '9px', marginBottom: '1mm' }}>
          Thank you for choosing Lips &amp; Sips.
        </div>
        <div style={{ fontSize: '9px', marginBottom: '4mm' }}>
          We look forward to seeing you again soon.
        </div>
        <div style={{ borderTop: '1px dashed #000', marginBottom: '4mm' }} />
        <div style={{ fontSize: '7px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '2px' }}>
          Powered by August Tech
        </div>
        <div style={{ fontSize: '7px', opacity: 0.4, marginTop: '1mm' }}>
          {tab.id.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
      <span style={{ opacity: 0.6 }}>{label}:</span>
      <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '50mm', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
