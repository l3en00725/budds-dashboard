import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get total invoice count
    const { count: totalInvoices } = await supabase
      .from('jobber_invoices')
      .select('*', { count: 'exact', head: true });

    // Get outstanding invoices
    const { data: outstandingInvoices } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, balance, issue_date, due_date, status')
      .neq('status', 'paid')
      .gt('balance', 0)
      .limit(10);

    // Get sample invoices
    const { data: sampleInvoices } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, balance, issue_date, due_date, status')
      .order('issue_date', { ascending: false })
      .limit(10);

    // Calculate total outstanding
    const totalOutstanding = outstandingInvoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    return NextResponse.json({
      totalInvoices,
      totalOutstanding,
      outstandingCount: outstandingInvoices?.length || 0,
      outstandingInvoices,
      sampleInvoices,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}