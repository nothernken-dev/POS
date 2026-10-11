// src/utils/printReceipt.js
import QRCode from 'qrcode';

/**
 * Escape HTML special characters.
 */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const currency = (n) => Number(n || 0).toFixed(2);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString('en-KE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

/**
 * Build the receipt HTML string.
 * The items table uses a real <table> so qty/price/total align perfectly
 * under their column headers.
 */
const buildReceiptHTML = (sale, shop = {}, qrDataUrl = '') => {
  const items = sale.items || [];
  const itemCount = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const shopName = shop?.name || sale.shop_name || 'MY SHOP';

  const itemsHTML = items
    .map((item) => {
      const name = item.product_name || item.name || 'Item';
      const sku = item.product_sku || item.sku || '';
      const lineTotal = (item.price || 0) * (item.quantity || 0);

      return `
        <tr>
          <td class="item-cell">
            <div class="item-name">${esc(name)}</div>
            ${sku ? `<div class="item-sku">SKU: ${esc(sku)}</div>` : ''}
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${currency(item.price)}</td>
          <td class="num">${currency(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

  const qrBlock = qrDataUrl
    ? `
      <div class="qr-block">
        <img src="${qrDataUrl}" alt="QR" class="qr-img" />
        <div class="qr-label">Scan to view receipt</div>
      </div>
    `
    : '';

  return `
    <div class="header">
      <div class="shop-name">${esc(shopName)}</div>
      ${shop?.address ? `<div class="small">${esc(shop.address)}</div>` : ''}
      ${shop?.phone ? `<div class="small">Tel: ${esc(shop.phone)}</div>` : ''}
      ${shop?.email ? `<div class="small">${esc(shop.email)}</div>` : ''}
    </div>

    <div class="divider">--------------------------------</div>

    <table class="meta">
      <tr><td>Receipt #:</td><td class="right">${esc(sale.sale_number || sale.id)}</td></tr>
      <tr><td>Date:</td><td class="right">${fmtDate(sale.created_at)}</td></tr>
      <tr><td>Customer:</td><td class="right">${esc(sale.customer_name || 'Walk-in')}</td></tr>
      ${sale.customer_phone ? `<tr><td>Phone:</td><td class="right">${esc(sale.customer_phone)}</td></tr>` : ''}
      <tr><td>Payment:</td><td class="right">${esc(sale.payment_method || 'Cash')}</td></tr>
    </table>

    <div class="divider">--------------------------------</div>

    <table class="items">
      <thead>
        <tr>
          <th class="item-cell left">Item</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="divider">--------------------------------</div>

    <table class="meta">
      <tr><td>Subtotal</td><td class="right">${currency(sale.subtotal)}</td></tr>
      ${Number(sale.discount) > 0 ? `<tr><td>Discount</td><td class="right">-${currency(sale.discount)}</td></tr>` : ''}
    </table>

    <table class="meta total-row">
      <tr>
        <td><b>TOTAL</b></td>
        <td class="right"><b>KES ${currency(sale.total)}</b></td>
      </tr>
    </table>

    <div class="divider">--------------------------------</div>

    <table class="meta">
      <tr><td>Items</td><td class="right">${itemCount}</td></tr>
    </table>

    ${sale.notes ? `<div class="divider">--------------------------------</div><div class="small">Notes: ${esc(sale.notes)}</div>` : ''}

    <div class="divider">--------------------------------</div>

    ${qrBlock}

    <div class="footer">
      <div class="bold">THANK YOU!</div>
      <div class="small">Please come again</div>
      <div class="small" style="margin-top: 6px;">${new Date().toLocaleString()}</div>
    </div>

    <div style="height: 60px;"></div>
  `;
};

/**
 * Receipt styles — optimized for 80mm thermal paper.
 * The <table class="items"> makes Qty/Price/Total line up cleanly under headers.
 */
const receiptStyles = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  body {
    font-family: 'Courier New', Consolas, monospace;
    font-size: 12px;
    line-height: 1.35;
    width: 80mm;
    padding: 2mm;
  }

  .header { text-align: center; }
  .shop-name { font-size: 15px; font-weight: 700; }
  .small { font-size: 10px; }
  .bold { font-weight: 700; }

  .divider {
    text-align: center;
    font-size: 11px;
    letter-spacing: -0.5px;
    overflow: hidden;
    white-space: nowrap;
    margin: 2px 0;
  }

  /* Meta rows */
  table.meta {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  table.meta td {
    padding: 1px 0;
    vertical-align: top;
  }
  table.meta .right {
    text-align: right;
    white-space: nowrap;
  }

  /* Items table — this is what keeps Qty/Price/Total aligned */
  table.items {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    table-layout: fixed;
  }
  table.items th,
  table.items td {
    padding: 2px 0;
    vertical-align: top;
  }
  table.items thead th {
    font-weight: 700;
    font-size: 11px;
    border-bottom: 1px dashed #000;
  }
  table.items .item-cell {
    width: 45%;
    word-break: break-word;
    text-align: left;
  }
  table.items .num {
    width: 18%;
    text-align: right;
    white-space: nowrap;
  }
  table.items thead .num {
    text-align: right;
  }
  table.items tbody tr {
    border-bottom: 0;
  }
  .item-name { font-weight: 400; }
  .item-sku { font-size: 10px; color: #333; }

  /* Total row (bolder) */
  table.total-row {
    margin-top: 4px;
    font-size: 14px;
  }

  /* Footer */
  .footer { text-align: center; margin-top: 8px; }

  /* QR code block */
  .qr-block {
    text-align: center;
    margin: 8px 0;
  }
  .qr-img {
    width: 30mm;
    height: 30mm;
    display: block;
    margin: 0 auto;
  }
  .qr-label {
    font-size: 9px;
    margin-top: 2px;
  }
`;

/**
 * Build the QR payload — a short JSON string the customer can scan.
 * You can change this to a URL if you have a public receipt page.
 */
const buildQrPayload = (sale, shop) => {
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : '';
  return JSON.stringify({
    shop: shop?.name || sale.shop_name || '',
    receipt: sale.sale_number || String(sale.id),
    date: sale.created_at,
    total: Number(sale.total || 0).toFixed(2),
    items: (sale.items || []).length,
    verify: `${baseUrl}/receipt/${sale.sale_number || sale.id}`,
  });
};

/**
 * Main entry point: renders the receipt to an off-screen iframe
 * and triggers window.print() on that iframe only.
 */
export const printReceipt = async (sale, shop = {}) => {
  if (!sale) {
    console.error('printReceipt: no sale provided');
    return;
  }

  // Generate QR data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(buildQrPayload(sale, shop), {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 240,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch (err) {
    console.error('QR generation failed:', err);
    // Continue printing without QR
  }

  const html = buildReceiptHTML(sale, shop, qrDataUrl);

  // Create the iframe
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${esc(sale.sale_number || sale.id)}</title>
        <style>${receiptStyles}</style>
      </head>
      <body>${html}</body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      // Clean up after the dialog closes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };

  // Prefer onload, but fall back to a short timer for browsers
  // that don't reliably fire onload after doc.write.
  let printed = false;
  iframe.onload = () => {
    if (printed) return;
    printed = true;
    triggerPrint();
  };

  setTimeout(() => {
    if (printed) return;
    printed = true;
    triggerPrint();
  }, 300);
};

export default printReceipt;