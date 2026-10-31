const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const invoiceHtml = inv => `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(inv.number)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#222;max-width:820px;margin:32px auto;padding:0 20px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
  h1{margin:0;font-size:26px} .brand{font-size:22px;font-weight:700;color:#4f46e5}
  .muted{color:#666;font-size:13px} .badge{display:inline-block;padding:3px 10px;border-radius:12px;background:#eef;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
  th,td{padding:8px;border-bottom:1px solid #ddd;text-align:right} th:first-child,td:first-child{text-align:left}
  th{background:#f5f5f8;font-size:12px;text-transform:uppercase}
  .tot{margin:18px 0 0 auto;width:280px;font-size:14px} .tot div{display:flex;justify-content:space-between;padding:4px 0}
  .grand{font-weight:700;font-size:16px;border-top:2px solid #222;margin-top:6px;padding-top:8px!important}
  button{margin-bottom:16px;padding:8px 16px;cursor:pointer} @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()">Print</button>
<div class="top">
  <div><div class="brand">Brightloop Software</div><div class="muted">Subscription invoice</div></div>
  <div style="text-align:right"><h1>${esc(inv.number)}</h1><span class="badge">${esc(inv.status)}</span></div>
</div>
<div style="display:flex;justify-content:space-between">
  <div><strong>Bill to</strong><br>${esc(inv.customerName)}<br><span class="muted">${esc(inv.customerEmail)}</span></div>
  <div class="muted" style="text-align:right">Subscription: ${esc(inv.subscriptionNumber)}<br>
    Invoice date: ${day(inv.invoiceDate)}<br>Due date: ${day(inv.dueDate)}<br>
    Period: ${day(inv.periodStart)} to ${day(inv.periodEnd)}</div>
</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead><tbody>
${inv.lines.map(l => `<tr>
  <td>${esc(l.name)}${l.variantLabel ? `<br><span class="muted">${esc(l.variantLabel)}</span>` : ''}</td>
  <td>${l.qty}</td><td>${money(l.unitPrice)}</td><td>${money(l.discountAmount)}</td>
  <td>${esc(l.taxName || '-')} ${l.taxRate ? `(${l.taxRate}%)` : ''}</td><td>${money(l.total)}</td></tr>`).join('')}
</tbody></table>
<div class="tot">
  <div><span>Subtotal</span><span>${money(inv.subtotal)}</span></div>
  <div><span>Discount${inv.discountName ? ` (${esc(inv.discountName)})` : ''}</span><span>- ${money(inv.discountTotal)}</span></div>
  <div><span>Tax</span><span>${money(inv.taxTotal)}</span></div>
  <div class="grand"><span>Total</span><span>${money(inv.total)}</span></div>
  <div><span>Paid</span><span>${money(inv.amountPaid)}</span></div>
  <div><strong>Balance due</strong><strong>${money(inv.total - inv.amountPaid)}</strong></div>
</div></body></html>`;