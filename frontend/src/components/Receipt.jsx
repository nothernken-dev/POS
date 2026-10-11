// src/components/Receipt.jsx
import React from 'react';

const Receipt = ({ sale, shop = {} }) => {
  if (!sale) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-KE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const currency = (n) => Number(n || 0).toFixed(2);
  const items = sale.items || [];
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const shopName = shop?.name || sale.shop_name || 'MY SHOP';

  return (
    <div
      id="receipt-print-area"
      className="bg-white text-black font-mono text-[12px] leading-tight w-[80mm] p-[4mm] mx-auto box-border"
    >
      {/* Header */}
      <div className="text-center font-bold text-[14px]">{shopName}</div>
      {shop?.address && (
        <div className="text-center text-[10px]">{shop.address}</div>
      )}
      {shop?.phone && (
        <div className="text-center text-[10px]">Tel: {shop.phone}</div>
      )}
      {shop?.email && (
        <div className="text-center text-[10px]">{shop.email}</div>
      )}

      <Divider />

      {/* Meta */}
      <Row label="Receipt #:" value={sale.sale_number || sale.id} />
      <Row label="Date:" value={formatDate(sale.created_at)} />
      <Row label="Customer:" value={sale.customer_name || 'Walk-in'} />
      {sale.customer_phone && (
        <Row label="Phone:" value={sale.customer_phone} />
      )}
      <Row label="Payment:" value={sale.payment_method || 'Cash'} />

      <Divider />

      {/* Column headers */}
      <div className="flex font-bold text-[11px]">
        <span className="flex-1 min-w-0">Item</span>
        <span className="w-8 text-center">Qty</span>
        <span className="w-14 text-right">Price</span>
        <span className="w-16 text-right">Total</span>
      </div>

      <Divider />

      {/* Items */}
      {items.map((item, idx) => {
        const name = item.product_name || item.name || 'Item';
        const sku = item.product_sku || item.sku || '';
        const lineTotal = (item.price || 0) * (item.quantity || 0);

        return (
          <div key={idx} className="mb-1">
            <div className="break-words">{name}</div>
            <div className="flex pl-2">
              <span className="w-8 text-center">{item.quantity}</span>
              <span className="w-14 text-right">{currency(item.price)}</span>
              <span className="w-16 text-right">{currency(lineTotal)}</span>
            </div>
            {sku && (
              <div className="text-[10px] text-gray-700 pl-2">
                SKU: {sku}
              </div>
            )}
          </div>
        );
      })}

      <Divider />

      {/* Totals */}
      <Row label="Subtotal" value={currency(sale.subtotal)} />
      {Number(sale.discount) > 0 && (
        <Row label="Discount" value={`-${currency(sale.discount)}`} />
      )}

      <div className="flex justify-between font-bold text-[14px] mt-1">
        <span>TOTAL</span>
        <span>KES {currency(sale.total)}</span>
      </div>

      <Divider />

      <Row label="Items" value={itemCount} />

      {sale.notes && (
        <>
          <Divider />
          <div className="text-[10px]">Notes: {sale.notes}</div>
        </>
      )}

      <Divider />

      {/* Footer */}
      <div className="text-center font-bold mt-2">THANK YOU!</div>
      <div className="text-center text-[10px]">Please come again</div>
      <div className="text-center text-[10px] mt-2">
        {new Date().toLocaleString()}
      </div>

      {/* Feed space for thermal cutter */}
      <div className="h-[60px]" />
    </div>
  );
};

// ---------- Small helpers ----------

const Divider = () => (
  <div className="text-center text-[11px] tracking-tighter overflow-hidden whitespace-nowrap my-[2px]">
    --------------------------------
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-1">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default Receipt;