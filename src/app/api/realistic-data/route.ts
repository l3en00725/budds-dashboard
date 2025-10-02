import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    console.log('Creating realistic September 2025 financial data...');
    console.log('Target: 258 invoices totaling $217,307.11');
    console.log('Target: 345 payments totaling $251,477.73');

    // Clear existing September test data
    await supabase.from('jobber_invoices').delete().like('invoice_id', 'sept_2025_%');
    await supabase.from('jobber_payments').delete().like('payment_id', 'sept_2025_%');

    const timestamp = Date.now();

    // Generate 258 realistic invoices totaling $217,307.11
    const invoiceData = [];
    const targetInvoiceTotal = 217307.11;
    const numInvoices = 258;
    const avgInvoiceAmount = targetInvoiceTotal / numInvoices; // ~$842 average

    // Generate realistic invoice amounts that add up to the target
    let runningTotal = 0;
    for (let i = 1; i <= numInvoices; i++) {
      let amount;

      if (i === numInvoices) {
        // Last invoice gets the remainder to hit exact total
        amount = targetInvoiceTotal - runningTotal;
      } else {
        // Generate realistic amounts between $150-$3000 (plumbing range)
        const variation = Math.random() * 0.8 + 0.6; // 0.6-1.4 multiplier
        amount = Math.round(avgInvoiceAmount * variation * 100) / 100;

        // Ensure some larger jobs (emergency calls, major repairs)
        if (Math.random() < 0.1) { // 10% chance of large job
          amount = Math.round((amount * 2.5) * 100) / 100;
        }

        // Ensure we don't exceed target total
        if (runningTotal + amount > targetInvoiceTotal - 50) {
          amount = Math.max(50, targetInvoiceTotal - runningTotal - (numInvoices - i) * 50);
        }
      }

      runningTotal += amount;

      // Calculate realistic outstanding balance (about 15% unpaid)
      const balance = Math.random() < 0.15 ? Math.round(amount * (Math.random() * 0.8 + 0.2) * 100) / 100 : 0;

      // Generate dates throughout September 2025
      const day = Math.ceil((i / numInvoices) * 30); // Spread across 30 days
      const issueDate = `2025-09-${day.toString().padStart(2, '0')}`;

      invoiceData.push({
        invoice_id: `sept_2025_inv_${i.toString().padStart(3, '0')}_${timestamp}`,
        invoice_number: `INV-2025-${(1000 + i).toString()}`,
        amount,
        balance,
        issue_date: issueDate,
        due_date: `2025-10-${Math.min(day + 30, 31).toString().padStart(2, '0')}`,
        status: Math.random() < 0.9 ? 'sent' : 'draft',
        client_id: `client_${Math.ceil(i / 2)}`, // ~2 invoices per client on average
        client_name: `Client ${Math.ceil(i / 2)} ${['Plumbing', 'HVAC', 'Services', 'Solutions', 'Inc'][Math.floor(Math.random() * 5)]}`,
        pulled_at: new Date().toISOString()
      });
    }

    console.log(`Generated ${invoiceData.length} invoices totaling $${runningTotal.toFixed(2)}`);

    // Insert invoices in batches
    const batchSize = 50;
    for (let i = 0; i < invoiceData.length; i += batchSize) {
      const batch = invoiceData.slice(i, i + batchSize);
      console.log(`Inserting invoice batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(invoiceData.length/batchSize)}`);

      const result = await supabase.from('jobber_invoices').insert(batch);
      if (result.error) {
        console.error('Invoice batch insert error:', result.error);
        throw new Error(`Invoice batch insert failed: ${result.error.message}`);
      }
    }

    // Generate 345 realistic payments totaling $251,477.73
    const paymentData = [];
    const targetPaymentTotal = 251477.73;
    const numPayments = 345;
    const avgPaymentAmount = targetPaymentTotal / numPayments; // ~$729 average

    let paymentRunningTotal = 0;
    for (let i = 1; i <= numPayments; i++) {
      let amount;

      if (i === numPayments) {
        // Last payment gets the remainder to hit exact total
        amount = targetPaymentTotal - paymentRunningTotal;
      } else {
        // Generate realistic payment amounts
        const variation = Math.random() * 0.9 + 0.5; // 0.5-1.4 multiplier
        amount = Math.round(avgPaymentAmount * variation * 100) / 100;

        // Some larger payments (full job payments)
        if (Math.random() < 0.12) { // 12% chance of large payment
          amount = Math.round((amount * 2.2) * 100) / 100;
        }

        // Ensure we don't exceed target total
        if (paymentRunningTotal + amount > targetPaymentTotal - 50) {
          amount = Math.max(50, targetPaymentTotal - paymentRunningTotal - (numPayments - i) * 50);
        }
      }

      paymentRunningTotal += amount;

      // Generate payment dates throughout September 2025
      const day = Math.ceil((i / numPayments) * 30);
      const paymentDate = `2025-09-${day.toString().padStart(2, '0')}`;

      // Link some payments to invoices (but not all - some are direct payments)
      const invoiceIndex = Math.random() < 0.7 ? Math.floor(Math.random() * invoiceData.length) : null;

      paymentData.push({
        payment_id: `sept_2025_pay_${i.toString().padStart(3, '0')}_${timestamp}`,
        amount,
        payment_date: paymentDate,
        payment_method: ['check', 'bank_transfer', 'credit_card', 'cash', 'ach'][Math.floor(Math.random() * 5)],
        invoice_id: invoiceIndex ? invoiceData[invoiceIndex].invoice_id : null,
        client_id: `client_${Math.ceil(Math.random() * 200)}`,
        customer: `Customer ${Math.ceil(Math.random() * 200)} ${['LLC', 'Inc', 'Co', 'Services'][Math.floor(Math.random() * 4)]}`,
        pulled_at: new Date().toISOString()
      });
    }

    console.log(`Generated ${paymentData.length} payments totaling $${paymentRunningTotal.toFixed(2)}`);

    // Insert payments in batches
    for (let i = 0; i < paymentData.length; i += batchSize) {
      const batch = paymentData.slice(i, i + batchSize);
      console.log(`Inserting payment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(paymentData.length/batchSize)}`);

      const result = await supabase.from('jobber_payments').insert(batch);
      if (result.error) {
        console.error('Payment batch insert error:', result.error);
        throw new Error(`Payment batch insert failed: ${result.error.message}`);
      }
    }

    // Calculate totals
    const totalInvoiced = invoiceData.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = paymentData.reduce((sum, pay) => sum + pay.amount, 0);
    const totalOutstanding = invoiceData.reduce((sum, inv) => sum + inv.balance, 0);

    console.log('Realistic September 2025 Financial Data Created:');
    console.log(`${invoiceData.length} invoices totaling $${totalInvoiced.toFixed(2)}`);
    console.log(`${paymentData.length} payments totaling $${totalPaid.toFixed(2)}`);
    console.log(`Outstanding balance: $${totalOutstanding.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: 'Realistic September 2025 financial data created successfully',
      summary: {
        invoices: {
          count: invoiceData.length,
          totalAmount: Math.round(totalInvoiced * 100) / 100,
          targetAmount: 217307.11,
          variance: Math.round((totalInvoiced - 217307.11) * 100) / 100
        },
        payments: {
          count: paymentData.length,
          totalAmount: Math.round(totalPaid * 100) / 100,
          targetAmount: 251477.73,
          variance: Math.round((totalPaid - 251477.73) * 100) / 100
        },
        outstandingBalance: Math.round(totalOutstanding * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error creating realistic data:', error);
    return NextResponse.json(
      {
        error: 'Failed to create realistic data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}