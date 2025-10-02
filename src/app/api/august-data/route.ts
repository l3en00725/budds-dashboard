import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    console.log('Creating August 2025 data for month-over-month comparison...');

    // Clear existing August test data
    await supabase.from('jobber_invoices').delete().like('invoice_id', 'aug_2025_%');
    await supabase.from('jobber_payments').delete().like('payment_id', 'aug_2025_%');

    const timestamp = Date.now();

    // Generate August data - make it smaller than September to show positive growth
    // August: 220 invoices, 280 payments (lower volume, showing September growth)
    const augustInvoiceTotal = 185000.00; // Lower than September's $217K
    const augustPaymentTotal = 195000.00; // Lower than September's $251K
    const numInvoices = 220;
    const numPayments = 280;

    // Generate August invoices
    const invoiceData = [];
    const avgInvoiceAmount = augustInvoiceTotal / numInvoices;

    let runningTotal = 0;
    for (let i = 1; i <= numInvoices; i++) {
      let amount;

      if (i === numInvoices) {
        amount = augustInvoiceTotal - runningTotal;
      } else {
        const variation = Math.random() * 0.8 + 0.6;
        amount = Math.round(avgInvoiceAmount * variation * 100) / 100;

        if (Math.random() < 0.08) { // Slightly fewer large jobs in August
          amount = Math.round((amount * 2.2) * 100) / 100;
        }

        if (runningTotal + amount > augustInvoiceTotal - 50) {
          amount = Math.max(50, augustInvoiceTotal - runningTotal - (numInvoices - i) * 50);
        }
      }

      runningTotal += amount;

      // Generate dates throughout August 2025
      const day = Math.ceil((i / numInvoices) * 31);
      const issueDate = `2025-08-${day.toString().padStart(2, '0')}`;

      const balance = Math.random() < 0.18 ? Math.round(amount * (Math.random() * 0.7 + 0.2) * 100) / 100 : 0;

      invoiceData.push({
        invoice_id: `aug_2025_inv_${i.toString().padStart(3, '0')}_${timestamp}`,
        invoice_number: `INV-2025-${(500 + i).toString()}`,
        amount,
        balance,
        issue_date: issueDate,
        due_date: `2025-09-${Math.min(day, 30).toString().padStart(2, '0')}`,
        status: Math.random() < 0.88 ? 'sent' : 'draft',
        client_id: `client_${Math.ceil(i / 2)}`,
        client_name: `Client ${Math.ceil(i / 2)} ${['Plumbing', 'HVAC', 'Services', 'Solutions', 'Inc'][Math.floor(Math.random() * 5)]}`,
        pulled_at: new Date().toISOString()
      });
    }

    console.log(`Generated ${invoiceData.length} August invoices totaling $${runningTotal.toFixed(2)}`);

    // Insert August invoices in batches
    const batchSize = 50;
    for (let i = 0; i < invoiceData.length; i += batchSize) {
      const batch = invoiceData.slice(i, i + batchSize);
      console.log(`Inserting August invoice batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(invoiceData.length/batchSize)}`);

      const result = await supabase.from('jobber_invoices').insert(batch);
      if (result.error) {
        console.error('August invoice batch insert error:', result.error);
        throw new Error(`August invoice batch insert failed: ${result.error.message}`);
      }
    }

    // Generate August payments
    const paymentData = [];
    const avgPaymentAmount = augustPaymentTotal / numPayments;

    let paymentRunningTotal = 0;
    for (let i = 1; i <= numPayments; i++) {
      let amount;

      if (i === numPayments) {
        amount = augustPaymentTotal - paymentRunningTotal;
      } else {
        const variation = Math.random() * 0.85 + 0.5;
        amount = Math.round(avgPaymentAmount * variation * 100) / 100;

        if (Math.random() < 0.1) {
          amount = Math.round((amount * 2.0) * 100) / 100;
        }

        if (paymentRunningTotal + amount > augustPaymentTotal - 50) {
          amount = Math.max(50, augustPaymentTotal - paymentRunningTotal - (numPayments - i) * 50);
        }
      }

      paymentRunningTotal += amount;

      const day = Math.ceil((i / numPayments) * 31);
      const paymentDate = `2025-08-${day.toString().padStart(2, '0')}`;

      const invoiceIndex = Math.random() < 0.65 ? Math.floor(Math.random() * invoiceData.length) : null;

      paymentData.push({
        payment_id: `aug_2025_pay_${i.toString().padStart(3, '0')}_${timestamp}`,
        amount,
        payment_date: paymentDate,
        payment_method: ['check', 'bank_transfer', 'credit_card', 'cash', 'ach'][Math.floor(Math.random() * 5)],
        invoice_id: invoiceIndex ? invoiceData[invoiceIndex].invoice_id : null,
        client_id: `client_${Math.ceil(Math.random() * 180)}`,
        customer: `Customer ${Math.ceil(Math.random() * 180)} ${['LLC', 'Inc', 'Co', 'Services'][Math.floor(Math.random() * 4)]}`,
        pulled_at: new Date().toISOString()
      });
    }

    console.log(`Generated ${paymentData.length} August payments totaling $${paymentRunningTotal.toFixed(2)}`);

    // Insert August payments in batches
    for (let i = 0; i < paymentData.length; i += batchSize) {
      const batch = paymentData.slice(i, i + batchSize);
      console.log(`Inserting August payment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(paymentData.length/batchSize)}`);

      const result = await supabase.from('jobber_payments').insert(batch);
      if (result.error) {
        console.error('August payment batch insert error:', result.error);
        throw new Error(`August payment batch insert failed: ${result.error.message}`);
      }
    }

    // Calculate growth percentages
    const septInvoiced = 217307.11;
    const septPaid = 251477.73;

    const invoiceGrowth = Math.round(((septInvoiced - augustInvoiceTotal) / augustInvoiceTotal) * 100);
    const paymentGrowth = Math.round(((septPaid - augustPaymentTotal) / augustPaymentTotal) * 100);

    const totalInvoiced = invoiceData.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = paymentData.reduce((sum, pay) => sum + pay.amount, 0);
    const totalOutstanding = invoiceData.reduce((sum, inv) => sum + inv.balance, 0);

    console.log('August 2025 Financial Data Created:');
    console.log(`${invoiceData.length} invoices totaling $${totalInvoiced.toFixed(2)}`);
    console.log(`${paymentData.length} payments totaling $${totalPaid.toFixed(2)}`);
    console.log(`Outstanding balance: $${totalOutstanding.toFixed(2)}`);
    console.log(`\nMonth-over-Month Growth:`);
    console.log(`Invoiced: +${invoiceGrowth}% (Aug: $${augustInvoiceTotal.toLocaleString()} → Sep: $${septInvoiced.toLocaleString()})`);
    console.log(`Collected: +${paymentGrowth}% (Aug: $${augustPaymentTotal.toLocaleString()} → Sep: $${septPaid.toLocaleString()})`);

    return NextResponse.json({
      success: true,
      message: 'August 2025 comparison data created successfully',
      summary: {
        invoices: {
          count: invoiceData.length,
          totalAmount: Math.round(totalInvoiced * 100) / 100
        },
        payments: {
          count: paymentData.length,
          totalAmount: Math.round(totalPaid * 100) / 100
        },
        outstandingBalance: Math.round(totalOutstanding * 100) / 100,
        growth: {
          invoiceGrowth: `+${invoiceGrowth}%`,
          paymentGrowth: `+${paymentGrowth}%`,
          septemberInvoiced: septInvoiced,
          septemberPaid: septPaid
        }
      }
    });

  } catch (error) {
    console.error('Error creating August data:', error);
    return NextResponse.json(
      {
        error: 'Failed to create August data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}