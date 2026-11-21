var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

test('invoice uses the HSN slab used by order pricing', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }];
  var ledgerFigures = pricing.computeTotals(items, '');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items });

  assert.equal(ledgerFigures.tax, 5);
  assert.equal(ledgerFigures.total, 105);
  assert.equal(invoiceFigures.tax, 5);
  assert.equal(invoiceFigures.total, 105);
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
});

test('invoice applies the same subtotal coupon discount and cap as order pricing', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  var ledgerFigures = pricing.computeTotals(items, 'WELCOME');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: 'WELCOME' });

  assert.equal(ledgerFigures.discount, 50);
  assert.equal(ledgerFigures.tax, 47.5);
  assert.equal(ledgerFigures.total, 997.5);
  assert.equal(invoiceFigures.discount, 50);
  assert.equal(invoiceFigures.tax, 47.5);
  assert.equal(invoiceFigures.total, 997.5);
});

test('GST reconciliation matches the stored ledger and recomputed invoice', function () {
  var db = {
    products: [],
    customers: [],
    orders: [{
      id: 1001,
      date: '2026-11-21',
      customer: 'Asha',
      items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
      subtotal: 100,
      discount: 0,
      tax: 5,
      total: 105,
      coupon: ''
    }]
  };

  var result = reports.getGstReconciliation(db);
  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.equal(result.rows[0].ledgerTax, 5);
  assert.equal(result.rows[0].invoiceTax, 5);
  assert.equal(result.rows[0].invoiceTotal, 105);
  assert.equal(result.rows[0].delta, 0);
  assert.equal(result.rows[0].matched, true);
});

test('invoice handles decimal gstRate as a decimal rate', function () {
  var items = [{ id: 1, name: 'Special', gstRate: 0.05, price: 100, qty: 1 }];
  var ledgerFigures = pricing.computeTotals(items, '');
  var invoiceFigures = invoice.computeInvoiceFigures({ items: items });

  assert.equal(ledgerFigures.tax, 5);
  assert.equal(invoiceFigures.tax, 5);
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
});
