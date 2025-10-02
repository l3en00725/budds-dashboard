import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Clear existing financial data
    await supabase.from('jobber_invoices').delete().neq('id', '');
    await supabase.from('jobber_payments').delete().neq('id', '');

    // Create test invoices for today that total $11,474.76
    const today = new Date().toISOString().split('T')[0];
    const invoices = [
      {
        invoice_id: 'test_inv_001',
        invoice_number: '2025-001',
        amount: 5474.76,
        balance: 5474.76,
        issue_date: today,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        client_id: 'test_client_001',
        client_name: 'Test Client 1',
        pulled_at: new Date().toISOString()
      },
      {
        invoice_id: 'test_inv_002',
        invoice_number: '2025-002',
        amount: 6000.00,
        balance: 6000.00,
        issue_date: today,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        client_id: 'test_client_002',
        client_name: 'Test Client 2',
        pulled_at: new Date().toISOString()
      }
    ];

    // Create test payments for today that total $1,827.31
    const payments = [
      {
        payment_id: 'test_pay_001',
        amount: 827.31,
        payment_date: today,
        payment_method: 'credit_card',
        status: 'completed',
        invoice_id: 'test_inv_003',
        invoice_number: '2025-003',
        pulled_at: new Date().toISOString()
      },
      {
        payment_id: 'test_pay_002',
        amount: 1000.00,
        payment_date: today,
        payment_method: 'check',
        status: 'completed',
        invoice_id: 'test_inv_004',
        invoice_number: '2025-004',
        pulled_at: new Date().toISOString()
      }
    ];

    // Create outstanding AR invoices that total $83,700
    const arInvoices = [
      {
        invoice_id: 'test_ar_001',
        invoice_number: '2024-250',
        amount: 25000.00,
        balance: 25000.00,
        issue_date: '2024-12-15',
        due_date: '2025-01-15',
        status: 'sent',
        client_id: 'test_client_ar_001',
        client_name: 'Big Commercial Client',
        pulled_at: new Date().toISOString()
      },
      {
        invoice_id: 'test_ar_002',
        invoice_number: '2024-275',
        amount: 18700.00,
        balance: 18700.00,
        issue_date: '2024-12-20',
        due_date: '2025-01-20',
        status: 'sent',
        client_id: 'test_client_ar_002',
        client_name: 'Large Residential Project',
        pulled_at: new Date().toISOString()
      },
      {
        invoice_id: 'test_ar_003',
        invoice_number: '2025-010',
        amount: 40000.00,
        balance: 40000.00,
        issue_date: '2025-01-10',
        due_date: '2025-02-10',
        status: 'sent',
        client_id: 'test_client_ar_003',
        client_name: 'Hotel Renovation Project',
        pulled_at: new Date().toISOString()
      }
    ];

    // Insert all test data
    const allInvoices = [...invoices, ...arInvoices];

    console.log('Inserting invoices:', allInvoices.length);
    for (const invoice of allInvoices) {
      const result = await supabase.from('jobber_invoices').insert(invoice);
      if (result.error) {
        console.error('Invoice insert error:', result.error);
        throw new Error(`Invoice insert failed: ${result.error.message}`);
      }
    }

    console.log('Inserting payments:', payments.length);
    for (const payment of payments) {
      const result = await supabase.from('jobber_payments').insert(payment);
      if (result.error) {
        console.error('Payment insert error:', result.error);
        throw new Error(`Payment insert failed: ${result.error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test financial data created successfully',
      data: {
        invoicesCreated: allInvoices.length,
        paymentsCreated: payments.length,
        totals: {
          invoicedToday: invoices.reduce((sum, inv) => sum + inv.amount, 0),
          paidToday: payments.reduce((sum, pay) => sum + pay.amount, 0),
          arOutstanding: arInvoices.reduce((sum, inv) => sum + inv.balance, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error creating test financial data:', error);
    return NextResponse.json(
      { error: 'Failed to create test data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}