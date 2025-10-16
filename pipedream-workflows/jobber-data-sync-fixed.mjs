import { createClient } from "@supabase/supabase-js";

export default defineComponent({
  async run({ $, steps }) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // === Load valid access token ===
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("jobber_tokens")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (tokenErr || !tokenRow) throw new Error("❌ Missing Jobber token in Supabase.");

    const accessToken = tokenRow.access_token;
    const gqlHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20", // Updated to latest version
    };

    // Set historical date to September 1st, 2025 for accurate financial data
    const startDate = "2025-09-01T00:00:00Z";
    const endDate = "2025-10-07T23:59:59Z";

    // Helper: throttle to stay under rate limit
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));

    // === Fetch all invoices ===
    async function fetchInvoices() {
      let all = [];
      let after = null;
      do {
        const res = await fetch("https://api.getjobber.com/api/graphql", {
          method: "POST",
          headers: gqlHeaders,
          body: JSON.stringify({
            query: `
              query GetInvoices($after: String, $createdAtGte: DateTime) {
                invoices(
                  first: 20
                  after: $after
                  filter: { createdAtGte: $createdAtGte }
                ) {
                  nodes {
                    id
                    invoiceNumber
                    subject
                    invoiceStatus
                    issuedDate
                    dueDate
                    receivedDate
                    createdAt
                    updatedAt
                    client { id firstName lastName companyName }
                    amounts { subtotal total paymentsTotal invoiceBalance }
                    jobs {
                      nodes {
                        id
                        jobNumber
                        title
                        jobStatus
                        startAt
                        endAt
                      }
                    }
                    paymentRecords {
                      nodes {
                        id
                        entryDate
                        amount
                        jobberPaymentPaymentMethod
                        jobberPaymentTransactionStatus
                        tipAmount
                      }
                    }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }`,
            variables: { after, createdAtGte: startDate },
          }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(JSON.stringify(json.errors));
        const { nodes, pageInfo } = json.data.invoices;
        all.push(...nodes);
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
        await pause(500);
      } while (after);
      return all;
    }

    // === Fetch all jobs (using correct field names) ===
    async function fetchJobs() {
      let all = [];
      let after = null;
      do {
        const res = await fetch("https://api.getjobber.com/api/graphql", {
          method: "POST",
          headers: gqlHeaders,
          body: JSON.stringify({
            query: `
              query GetJobs($after: String, $createdAtGte: DateTime) {
                jobs(
                  first: 20
                  after: $after
                  filter: { createdAtGte: $createdAtGte }
                ) {
                  nodes {
                    id
                    jobNumber
                    title
                    jobStatus
                    startAt
                    endAt
                    updatedAt
                    createdAt
                    total
                    lineItems {
                      nodes { id name description quantity unitCost totalCost }
                    }
                    client { id firstName lastName companyName }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }`,
            variables: { after, createdAtGte: startDate },
          }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(JSON.stringify(json.errors));
        const { nodes, pageInfo } = json.data.jobs;
        all.push(...nodes);
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
        await pause(500);
      } while (after);
      return all;
    }

    // === Fetch payments ===
    async function fetchPayments() {
      let all = [];
      let after = null;
      do {
        const res = await fetch("https://api.getjobber.com/api/graphql", {
          method: "POST",
          headers: gqlHeaders,
          body: JSON.stringify({
            query: `
              query GetPayments($after: String, $createdAtGte: DateTime) {
                payments(
                  first: 20
                  after: $after
                  filter: { createdAtGte: $createdAtGte }
                ) {
                  nodes {
                    id
                    amount
                    paymentDate
                    paymentMethod
                    createdAt
                    client {
                      id
                      firstName
                      lastName
                      companyName
                    }
                    invoice {
                      id
                      invoiceNumber
                    }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }`,
            variables: { after, createdAtGte: startDate },
          }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(JSON.stringify(json.errors));
        const { nodes, pageInfo } = json.data.payments;
        all.push(...nodes);
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
        await pause(500);
      } while (after);
      return all;
    }

    // === Pull data ===
    const [invoices, jobs, payments] = await Promise.all([
      fetchInvoices(),
      fetchJobs(),
      fetchPayments()
    ]);

    // === UPSERT INVOICES & INVOICE PAYMENTS ===
    for (const inv of invoices) {
      const clientName =
        inv.client?.companyName ||
        `${inv.client?.firstName ?? ""} ${inv.client?.lastName ?? ""}`.trim();

      await supabase.from("jobber_invoices").upsert({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        subject: inv.subject,
        invoice_status: inv.invoiceStatus,
        total: inv.amounts?.total ?? 0,
        amount_paid: inv.amounts?.paymentsTotal ?? 0,
        amount_outstanding: inv.amounts?.invoiceBalance ?? 0,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
        sent_at: inv.issuedDate,
        due_at: inv.dueDate,
        job_id: inv.jobs?.nodes?.[0]?.id ?? null,
        client_id: inv.client?.id ?? null,
        client_name: clientName || "Unknown",
        pulled_at: new Date().toISOString(),
      });

      for (const pay of inv.paymentRecords?.nodes || []) {
        await supabase.from("jobber_payments").upsert({
          id: pay.id,
          amount: pay.amount,
          payment_method: pay.jobberPaymentPaymentMethod,
          payment_status: pay.jobberPaymentTransactionStatus,
          received_at: pay.entryDate,
          invoice_id: inv.id,
          invoice_number: inv.invoiceNumber,
          client_id: inv.client?.id ?? null,
          client_name: clientName,
          pulled_at: new Date().toISOString(),
        });
      }
    }

    // === UPSERT JOBS (with corrected field names) ===
    for (const job of jobs) {
      const clientName =
        job.client?.companyName ||
        `${job.client?.firstName ?? ""} ${job.client?.lastName ?? ""}`.trim();

      // Determine if job is closed based on jobStatus
      const isClosedJob = job.jobStatus === 'complete' || job.jobStatus === 'invoicing';

      await supabase.from("jobber_jobs").upsert({
        id: job.id,
        job_number: job.jobNumber,
        title: job.title,
        job_status: job.jobStatus,
        closed_at: isClosedJob ? (job.endAt || job.updatedAt) : null, // Derive closed date
        start_at: job.startAt,
        end_at: job.endAt,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
        total_amount: job.total,
        client_id: job.client?.id ?? null,
        client_name: clientName || "Unknown",
        pulled_at: new Date().toISOString(),
      });

      // Store line items for detailed analysis
      for (const lineItem of job.lineItems?.nodes || []) {
        await supabase.from("jobber_line_items").upsert({
          id: lineItem.id,
          job_id: job.id,
          name: lineItem.name,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit_cost: lineItem.unitCost,
          total_cost: lineItem.totalCost,
          pulled_at: new Date().toISOString(),
        });
      }
    }

    // === UPSERT STANDALONE PAYMENTS ===
    for (const payment of payments) {
      const clientName =
        payment.client?.companyName ||
        `${payment.client?.firstName ?? ""} ${payment.client?.lastName ?? ""}`.trim();

      await supabase.from("jobber_payments").upsert({
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_method: payment.paymentMethod,
        created_at: payment.createdAt,
        invoice_id: payment.invoice?.id ?? null,
        invoice_number: payment.invoice?.invoiceNumber ?? null,
        client_id: payment.client?.id ?? null,
        client_name: clientName || "Unknown",
        pulled_at: new Date().toISOString(),
      });
    }

    $.export(
      "$summary",
      `✅ Synced ${invoices.length} invoices, ${jobs.length} jobs, ${payments.length} payments, and related line items successfully.`
    );
  },
});