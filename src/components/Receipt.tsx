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

  return (
    <div
      className="print:block hidden"
      style={{
        width: '58mm',
        margin: '0 auto',
        padding: '3mm 3mm',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '7.5px',
        lineHeight: '1.4',
        color: '#000',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.3px' }}>
          LIPS &amp; SIPS
        </div>
        <div style={{ fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Premium Club Terminal
        </div>
        <div style={{ borderTop: '1px dashed #000', marginTop: '2mm' }} />
      </div>

      {/* Details */}
      <div style={{ marginBottom: '2mm' }}>
        <Row label="DATE" value={`${dateStr} ${timeStr}`} />
        <Row label="REF" value={`#${tab.id.slice(0, 8).toUpperCase()}`} />
        <Row label="BY" value={staffName.toUpperCase()} />
        <Row label="CLIENT" value={tab.customerName.toUpperCase()} />
        {tab.paymentType && <Row label="VIA" value={tab.paymentType.toUpperCase()} />}
        {tab.mpesaPhone && <Row label="TEL" value={tab.mpesaPhone} />}
      </div>

      <div style={{ borderTop: '1px dashed #000', marginBottom: '2mm' }} />

      {/* Items */}
      <div style={{ marginBottom: '2mm' }}>
        <div style={{ display: 'flex', fontWeight: 700, marginBottom: '1mm', fontSize: '6.5px', borderBottom: '1px solid #ccc', paddingBottom: '1mm' }}>
          <span style={{ width: '8mm' }}>QTY</span>
          <span style={{ flex: 1 }}>ITEM</span>
          <span style={{ width: '14mm', textAlign: 'right' }}>KES</span>
        </div>
        {tab.items.map((item: TabItem, idx: number) => (
          <div key={idx} style={{ display: 'flex', marginBottom: '1mm' }}>
            <span style={{ width: '8mm' }}>{item.quantity}x</span>
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ width: '14mm', textAlign: 'right' }}>
              {(item.priceAtSale * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #000', marginBottom: '2mm' }} />

      {/* Total */}
      <div style={{ marginBottom: '3mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '10px' }}>
          <span>TOTAL</span>
          <span>KES {tab.total.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', marginBottom: '2mm' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '8px', fontWeight: 900, marginBottom: '1mm' }}>WELCOME AGAIN!</div>
        <div style={{ fontSize: '6.5px', marginBottom: '1mm' }}>Thank you for choosing Lips &amp; Sips.</div>
        <div style={{ borderTop: '1px dashed #000', marginTop: '2mm', paddingTop: '1.5mm' }} />
        <div style={{ fontSize: '6px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Powered by August Tech
        </div>
      </div>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8mm' }}>
      <span style={{ opacity: 0.55, minWidth: '8mm' }}>{label}:</span>
      <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '42mm', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
