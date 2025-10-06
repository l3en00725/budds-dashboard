import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Clear existing test financial data only
    await supabase.from('jobber_invoices').delete().like('invoice_id', 'test_%');
    await supabase.from('jobber_payments').delete().like('payment_id', 'test_%');

    // Create test invoices for today that total $11,474.76
    const today = new Date().toISOString().split('T')[0];
    const invoices = [
      {
        invoice_id: 'test_oct_inv_001',
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
        invoice_id: 'test_oct_inv_002',
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

    // Create test payments for October MTD (should total more than just today)
    const octStartDate = '2025-10-01';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const payments = [
      // October MTD payments - total should be around $45,000
      {
        payment_id: 'test_oct_mtd_001',
        amount: 15000.00,
        payment_date: octStartDate,
        payment_method: 'ach',
        customer: 'Major Commercial Client',
        pulled_at: new Date().toISOString()
      },
      {
        payment_id: 'test_oct_mtd_002',
        amount: 8500.00,
        payment_date: '2025-10-02',
        payment_method: 'check',
        customer: 'Residential Customer',
        pulled_at: new Date().toISOString()
      },
      {
        payment_id: 'test_oct_mtd_003',
        amount: 12750.00,
        payment_date: '2025-10-03',
        payment_method: 'credit_card',
        customer: 'Emergency Service Call',
        pulled_at: new Date().toISOString()
      },
      {
        payment_id: 'test_oct_pay_001',
        amount: 827.31,
        payment_date: today,
        payment_method: 'credit_card',
        invoice_id: 'test_inv_003',
        pulled_at: new Date().toISOString()
      },
      {
        payment_id: 'test_oct_pay_002',
        amount: 1000.00,
        payment_date: today,
        payment_method: 'check',
        invoice_id: 'test_inv_004',
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

    // Create test jobs completed today for daily revenue
    const jobsCompletedToday = [
      {
        job_id: 'test_job_today_001',
        job_number: '2025-OCT-001',
        title: 'Emergency Plumbing Repair',
        status: 'archived', // Completed status in Jobber
        revenue: 2500.00,
        client_name: 'Johnson Family',
        end_date: `${today}T14:30:00`,
        start_date: `${today}T09:00:00`,
        created_at_jobber: `${today}T08:00:00`,
        pulled_at: new Date().toISOString()
      },
      {
        job_id: 'test_job_today_002',
        job_number: '2025-OCT-002',
        title: 'HVAC Maintenance Call',
        status: 'archived',
        revenue: 1850.00,
        client_name: 'Smith Commercial Building',
        end_date: `${today}T16:15:00`,
        start_date: `${today}T13:00:00`,
        created_at_jobber: `${today}T12:30:00`,
        pulled_at: new Date().toISOString()
      },
      {
        job_id: 'test_job_today_003',
        job_number: '2025-OCT-003',
        title: 'Water Heater Installation',
        status: 'archived',
        revenue: 3200.00,
        client_name: 'Davis Residence',
        end_date: `${today}T17:45:00`,
        start_date: `${today}T14:00:00`,
        created_at_jobber: `${today}T13:45:00`,
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

    // Clear existing test jobs
    await supabase.from('jobber_jobs').delete().like('job_id', 'test_job_%');

    console.log('Inserting jobs completed today:', jobsCompletedToday.length);
    for (const job of jobsCompletedToday) {
      const result = await supabase.from('jobber_jobs').insert(job);
      if (result.error) {
        console.error('Job insert error:', result.error);
        throw new Error(`Job insert failed: ${result.error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test financial data created successfully',
      data: {
        invoicesCreated: allInvoices.length,
        paymentsCreated: payments.length,
        jobsCreated: jobsCompletedToday.length,
        totals: {
          invoicedToday: invoices.reduce((sum, inv) => sum + inv.amount, 0),
          paidOctoberMTD: payments.reduce((sum, pay) => sum + pay.amount, 0),
          arOutstanding: arInvoices.reduce((sum, inv) => sum + inv.balance, 0),
          jobsCompletedToday: jobsCompletedToday.reduce((sum, job) => sum + job.revenue, 0)
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