// Pipedream Workflow: Jobber Data Sync
// Sync jobs, quotes, invoices, and payments from Jobber API to Supabase every 5 minutes
// Author: Claude Code
// Version: 1.0

export default defineComponent({
  props: {
    // Trigger every 5 minutes
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 300, // 5 minutes
      },
    },
    // Supabase connection
    supabase_url: {
      type: "string",
      label: "Supabase URL",
      description: "Your Supabase project URL",
    },
    supabase_service_key: {
      type: "string",
      label: "Supabase Service Role Key",
      description: "Your Supabase service role key (keep secret)",
      secret: true,
    },
    // Jobber OAuth connection
    jobber_access_token: {
      type: "string",
      label: "Jobber Access Token",
      description: "OAuth access token for Jobber API",
      secret: true,
    },
    jobber_api_base_url: {
      type: "string",
      label: "Jobber API Base URL",
      description: "Jobber GraphQL API endpoint",
      default: "https://api.getjobber.com/api/graphql",
    },
  },

  async run({ steps, $ }) {
    const JOBBER_API_VERSION = "2023-03-15";
    const BATCH_SIZE = 100;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // Initialize Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(this.supabase_url, this.supabase_service_key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Helper function for API calls with retry logic
    async function makeJobberRequest(query, variables = {}, retryCount = 0) {
      try {
        const response = await fetch(this.jobber_api_base_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.jobber_access_token}`,
            'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        return data.data;
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return makeJobberRequest.call(this, query, variables, retryCount + 1);
        }
        throw error;
      }
    }

    // Helper function to log sync status
    async function logSyncStatus(syncType, status, recordsSync = 0, errorMessage = null, startTime = null) {
      const logData = {
        sync_type: syncType,
        status: status,
        records_synced: recordsSync,
        error_message: errorMessage,
        started_at: startTime?.toISOString() || new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sync_log')
        .insert([logData]);

      if (error) {
        console.error('Failed to log sync status:', error);
      }
    }

    // Helper function to upsert data to Supabase
    async function upsertToSupabase(table, data, conflictColumn) {
      if (!data || data.length === 0) return { count: 0 };

      const { data: result, error } = await supabase
        .from(table)
        .upsert(data, {
          onConflict: conflictColumn,
          ignoreDuplicates: false
        });

      if (error) {
        throw new Error(`Failed to upsert to ${table}: ${error.message}`);
      }

      return { count: data.length };
    }

    // GraphQL Queries
    const JOBS_QUERY = `
      query GetJobs($first: Int, $after: String) {
        jobs(first: $first, after: $after) {
          nodes {
            id
            jobNumber
            title
            description
            status
            startAt
            endAt
            createdAt
            updatedAt
            client {
              id
              firstName
              lastName
              companyName
            }
            lineItems {
              total
            }
            total
            invoices {
              id
              status
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const QUOTES_QUERY = `
      query GetQuotes($first: Int, $after: String) {
        quotes(first: $first, after: $after) {
          nodes {
            id
            quoteNumber
            status
            total
            createdAt
            expiresAt
            client {
              id
              firstName
              lastName
              companyName
              emails {
                address
              }
              phones {
                number
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const INVOICES_QUERY = `
      query GetInvoices($first: Int, $after: String) {
        invoices(first: $first, after: $after) {
          nodes {
            id
            invoiceNumber
            status
            issueDate
            dueDate
            total
            balance
            createdAt
            client {
              id
              firstName
              lastName
              companyName
            }
            job {
              id
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const PAYMENTS_QUERY = `
      query GetPayments($first: Int, $after: String) {
        payments(first: $first, after: $after) {
          nodes {
            id
            amount
            receivedOn
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
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    // Function to fetch all paginated data
    async function fetchAllData(query, dataKey) {
      let allData = [];
      let hasNextPage = true;
      let cursor = null;

      while (hasNextPage) {
        const variables = { first: BATCH_SIZE };
        if (cursor) variables.after = cursor;

        const result = await makeJobberRequest.call(this, query, variables);
        const pageData = result[dataKey];

        allData = allData.concat(pageData.nodes);
        hasNextPage = pageData.pageInfo.hasNextPage;
        cursor = pageData.pageInfo.endCursor;

        // Rate limiting - wait between requests
        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return allData;
    }

    // Transform and sync jobs
    async function syncJobs() {
      const startTime = new Date();
      await logSyncStatus('jobber_jobs', 'running', 0, null, startTime);

      try {
        console.log('Fetching jobs from Jobber...');
        const jobs = await fetchAllData.call(this, JOBS_QUERY, 'jobs');

        const transformedJobs = jobs.map(job => ({
          job_id: job.id,
          job_number: job.jobNumber,
          title: job.title,
          description: job.description,
          status: job.status,
          invoiced: job.invoices && job.invoices.length > 0,
          revenue: job.total || 0,
          client_id: job.client?.id,
          client_name: job.client ? `${job.client.firstName} ${job.client.lastName}`.trim() || job.client.companyName : null,
          start_date: job.startAt,
          end_date: job.endAt,
          created_at_jobber: job.createdAt,
          pulled_at: new Date().toISOString(),
        }));

        const result = await upsertToSupabase('jobber_jobs', transformedJobs, 'job_id');
        await logSyncStatus('jobber_jobs', 'success', result.count, null, startTime);

        console.log(`Successfully synced ${result.count} jobs`);
        return result.count;
      } catch (error) {
        console.error('Error syncing jobs:', error);
        await logSyncStatus('jobber_jobs', 'error', 0, error.message, startTime);
        throw error;
      }
    }

    // Transform and sync quotes
    async function syncQuotes() {
      const startTime = new Date();
      await logSyncStatus('jobber_quotes', 'running', 0, null, startTime);

      try {
        console.log('Fetching quotes from Jobber...');
        const quotes = await fetchAllData.call(this, QUOTES_QUERY, 'quotes');

        const transformedQuotes = quotes.map(quote => ({
          quote_id: quote.id,
          quote_number: quote.quoteNumber,
          client_id: quote.client?.id,
          client_name: quote.client ? `${quote.client.firstName} ${quote.client.lastName}`.trim() || quote.client.companyName : null,
          client_email: quote.client?.emails?.[0]?.address,
          client_phone: quote.client?.phones?.[0]?.number,
          status: quote.status,
          amount: quote.total || 0,
          created_at_jobber: quote.createdAt,
          expires_at: quote.expiresAt,
          pulled_at: new Date().toISOString(),
        }));

        const result = await upsertToSupabase('jobber_quotes', transformedQuotes, 'quote_id');
        await logSyncStatus('jobber_quotes', 'success', result.count, null, startTime);

        console.log(`Successfully synced ${result.count} quotes`);
        return result.count;
      } catch (error) {
        console.error('Error syncing quotes:', error);
        await logSyncStatus('jobber_quotes', 'error', 0, error.message, startTime);
        throw error;
      }
    }

    // Transform and sync invoices
    async function syncInvoices() {
      const startTime = new Date();
      await logSyncStatus('jobber_invoices', 'running', 0, null, startTime);

      try {
        console.log('Fetching invoices from Jobber...');
        const invoices = await fetchAllData.call(this, INVOICES_QUERY, 'invoices');

        const transformedInvoices = invoices.map(invoice => ({
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          client_id: invoice.client?.id,
          client_name: invoice.client ? `${invoice.client.firstName} ${invoice.client.lastName}`.trim() || invoice.client.companyName : null,
          job_id: invoice.job?.id,
          status: invoice.status,
          amount: invoice.total || 0,
          balance: invoice.balance || 0,
          issue_date: invoice.issueDate,
          due_date: invoice.dueDate,
          created_at_jobber: invoice.createdAt,
          pulled_at: new Date().toISOString(),
        }));

        const result = await upsertToSupabase('jobber_invoices', transformedInvoices, 'invoice_id');
        await logSyncStatus('jobber_invoices', 'success', result.count, null, startTime);

        console.log(`Successfully synced ${result.count} invoices`);
        return result.count;
      } catch (error) {
        console.error('Error syncing invoices:', error);
        await logSyncStatus('jobber_invoices', 'error', 0, error.message, startTime);
        throw error;
      }
    }

    // Transform and sync payments
    async function syncPayments() {
      const startTime = new Date();
      await logSyncStatus('jobber_payments', 'running', 0, null, startTime);

      try {
        console.log('Fetching payments from Jobber...');
        const payments = await fetchAllData.call(this, PAYMENTS_QUERY, 'payments');

        const transformedPayments = payments.map(payment => ({
          payment_id: payment.id,
          customer: payment.client ? `${payment.client.firstName} ${payment.client.lastName}`.trim() || payment.client.companyName : null,
          client_id: payment.client?.id,
          invoice_id: payment.invoice?.id,
          amount: payment.amount || 0,
          payment_date: payment.receivedOn,
          payment_method: payment.paymentMethod,
          created_at_jobber: payment.createdAt,
          pulled_at: new Date().toISOString(),
        }));

        const result = await upsertToSupabase('jobber_payments', transformedPayments, 'payment_id');
        await logSyncStatus('jobber_payments', 'success', result.count, null, startTime);

        console.log(`Successfully synced ${result.count} payments`);
        return result.count;
      } catch (error) {
        console.error('Error syncing payments:', error);
        await logSyncStatus('jobber_payments', 'error', 0, error.message, startTime);
        throw error;
      }
    }

    // Main execution
    try {
      console.log('Starting Jobber data sync...');

      const results = await Promise.allSettled([
        syncJobs.call(this),
        syncQuotes.call(this),
        syncInvoices.call(this),
        syncPayments.call(this),
      ]);

      const summary = {
        jobs: results[0].status === 'fulfilled' ? results[0].value : 0,
        quotes: results[1].status === 'fulfilled' ? results[1].value : 0,
        invoices: results[2].status === 'fulfilled' ? results[2].value : 0,
        payments: results[3].status === 'fulfilled' ? results[3].value : 0,
        errors: results.filter(r => r.status === 'rejected').map(r => r.reason.message),
      };

      console.log('Jobber sync completed:', summary);

      // Return summary for workflow monitoring
      return {
        success: true,
        timestamp: new Date().toISOString(),
        summary,
      };

    } catch (error) {
      console.error('Fatal error in Jobber sync:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});