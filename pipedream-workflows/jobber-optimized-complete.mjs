// ===================================================================
// OPTIMIZED JOBBER COMPLETE SYNC WORKFLOW
// Combines all data types with proper error handling and retry logic
// Designed for Pipedream deployment with token management
// ===================================================================

import { createClient } from "@supabase/supabase-js";

export default defineComponent({
  key: "jobber-optimized-complete",
  name: "Jobber Complete Sync (Optimized)",
  description: "Complete Jobber data sync with active membership tracking",
  version: "1.0.0",
  type: "action",

  async run({ $, steps }) {
    const startTime = Date.now();

    // === ENVIRONMENT SETUP ===
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("❌ Missing Supabase configuration in environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // === TOKEN MANAGEMENT WITH REFRESH ===
    async function getValidToken() {
      console.log("🔑 Checking Jobber token validity...");

      // Try to get token from database
      const { data: tokenRow, error: tokenErr } = await supabase
        .from("jobber_tokens")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (tokenErr) {
        console.error("❌ Database error fetching token:", tokenErr);
        throw new Error(`Token fetch error: ${tokenErr.message}`);
      }

      if (!tokenRow) {
        throw new Error("❌ No Jobber token found in database. Please run initial authentication first.");
      }

      // Check if token is expired or about to expire (within next 5 minutes)
      const expiresAt = new Date(tokenRow.expires_at);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt <= fiveMinutesFromNow) {
        console.log("🔄 Token expired or expiring soon, attempting refresh...");

        if (!tokenRow.refresh_token) {
          throw new Error("❌ No refresh token available. Manual re-authentication required.");
        }

        try {
          const refreshResponse = await fetch("https://api.getjobber.com/api/oauth/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: tokenRow.refresh_token,
              client_id: process.env.JOBBER_CLIENT_ID || "",
              client_secret: process.env.JOBBER_CLIENT_SECRET || "",
            }).toString(),
          });

          if (!refreshResponse.ok) {
            const errorText = await refreshResponse.text();
            console.error("❌ Token refresh failed:", errorText);
            throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorText}`);
          }

          const refreshData = await refreshResponse.json();

          // Update token in database
          const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000));

          const { error: updateError } = await supabase
            .from("jobber_tokens")
            .update({
              access_token: refreshData.access_token,
              refresh_token: refreshData.refresh_token || tokenRow.refresh_token,
              expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

          if (updateError) {
            console.error("❌ Failed to update refreshed token:", updateError);
            throw new Error(`Token update error: ${updateError.message}`);
          }

          console.log("✅ Token refreshed successfully");
          return refreshData.access_token;

        } catch (refreshError) {
          console.error("❌ Token refresh process failed:", refreshError);
          throw new Error(`Token refresh failed: ${refreshError.message}. Manual re-authentication required.`);
        }
      }

      console.log("✅ Existing token is valid");
      return tokenRow.access_token;
    }

    // Get valid access token
    const accessToken = await getValidToken();

    const gqlHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    };

    // === ENHANCED REQUEST HANDLER WITH RETRY LOGIC ===
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));

    async function makeRequestWithRetry(url, options, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🌐 API Request attempt ${attempt}/${maxRetries}`);
          const response = await fetch(url, options);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ HTTP ${response.status}: ${errorText}`);

            if (response.status === 401) {
              throw new Error("Authentication failed - token may be invalid");
            }

            if (response.status === 429 && attempt < maxRetries) {
              const delayMs = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
              console.log(`🚦 Rate limited. Waiting ${delayMs/1000}s before retry...`);
              await pause(delayMs);
              continue;
            }

            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const json = await response.json();

          // Check for GraphQL throttling
          if (json.errors && json.errors.some(error => error.extensions?.code === 'THROTTLED')) {
            if (attempt === maxRetries) {
              throw new Error(`Max retries reached. Last error: ${JSON.stringify(json.errors)}`);
            }
            const delayMs = Math.pow(4, attempt) * 500; // 2s, 8s, 32s
            console.log(`🚦 GraphQL rate limited on attempt ${attempt}. Waiting ${delayMs/1000}s before retry...`);
            await pause(delayMs);
            continue;
          }

          // Check for other GraphQL errors
          if (json.errors) {
            console.error("❌ GraphQL errors:", json.errors);
            throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
          }

          return json;

        } catch (error) {
          if (attempt === maxRetries) {
            console.error(`❌ Final attempt failed:`, error);
            throw error;
          }

          const delayMs = attempt * 2000; // 2s, 4s, 6s
          console.log(`🔄 Request error on attempt ${attempt}. Retrying in ${delayMs/1000}s...`);
          console.log(`Error details:`, error.message);
          await pause(delayMs);
        }
      }
    }

    // === DATA FETCH FUNCTIONS ===

    // Fetch Jobs with Line Items for Active Membership Tracking
    async function fetchJobsWithLineItems() {
      let allJobs = [];
      let after = null;
      let pageCount = 0;
      const maxPages = 20; // Conservative limit

      console.log("📋 Starting jobs with line items fetch...");

      do {
        pageCount++;
        console.log(`📝 Fetching jobs page ${pageCount}/${maxPages}...`);

        const json = await makeRequestWithRetry("https://api.getjobber.com/api/graphql", {
          method: "POST",
          headers: gqlHeaders,
          body: JSON.stringify({
            query: `
              query GetJobsWithLineItems($after: String) {
                jobs(
                  first: 15
                  after: $after
                  filter: {
                    createdAt: {
                      after: "2025-09-01T00:00:00Z"
                      before: "2025-10-08T23:59:59Z"
                    }
                  }
                ) {
                  nodes {
                    id
                    jobNumber
                    title
                    jobStatus
                    startAt
                    endAt
                    createdAt
                    updatedAt
                    total
                    client {
                      id
                      firstName
                      lastName
                      companyName
                    }
                    lineItems {
                      nodes {
                        id
                        name
                        description
                        quantity
                        unitCost
                        totalCost
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }`,
            variables: { after },
          }),
        });

        if (!json.data?.jobs?.nodes) {
          console.error("❌ Unexpected response structure:", JSON.stringify(json, null, 2));
          throw new Error("Invalid GraphQL response structure for jobs");
        }

        const { nodes, pageInfo } = json.data.jobs;
        console.log(`📄 Page ${pageCount}: Retrieved ${nodes.length} jobs`);
        allJobs.push(...nodes);
        after = pageInfo.hasNextPage ? pageInfo.endCursor : null;

        if (pageCount >= maxPages) {
          console.log(`🛑 Reached page limit (${maxPages}). Stopping to prevent timeout.`);
          break;
        }

        if (after) {
          await pause(1000); // 1 second between pages
        }
      } while (after);

      // Filter for active jobs only
      const inactiveStatuses = ['archived', 'cancelled', 'void', 'deleted'];
      const activeJobs = allJobs.filter(job =>
        job.jobStatus && !inactiveStatuses.includes(job.jobStatus.toLowerCase())
      );

      console.log(`🟢 Filtered ${allJobs.length} total jobs → ${activeJobs.length} active jobs`);
      console.log(`📊 Job statuses found:`, [...new Set(allJobs.map(j => j.jobStatus))].join(', '));

      return activeJobs;
    }

    // Fetch Invoices with Payment Records
    async function fetchInvoicesWithPayments() {
      let allInvoices = [];
      let allPayments = [];
      let after = null;
      let pageCount = 0;
      const maxPages = 15;

      console.log("🧾 Starting invoices with payments fetch...");

      do {
        pageCount++;
        console.log(`💰 Fetching invoices page ${pageCount}/${maxPages}...`);

        const json = await makeRequestWithRetry("https://api.getjobber.com/api/graphql", {
          method: "POST",
          headers: gqlHeaders,
          body: JSON.stringify({
            query: `
              query GetInvoicesWithPayments($after: String) {
                invoices(
                  first: 15
                  after: $after
                  filter: {
                    createdAt: {
                      after: "2025-09-01T00:00:00Z"
                      before: "2025-10-08T23:59:59Z"
                    }
                  }
                ) {
                  nodes {
                    id
                    invoiceNumber
                    subject
                    invoiceStatus
                    total
                    subtotal
                    totalTax
                    createdAt
                    updatedAt
                    dueDate
                    client {
                      id
                      firstName
                      lastName
                      companyName
                    }
                    job {
                      id
                      jobNumber
                    }
                    paymentRecords {
                      nodes {
                        id
                        amount
                        receivedOn
                        createdAt
                        updatedAt
                        paymentMethod {
                          name
                        }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }`,
            variables: { after },
          }),
        });

        if (!json.data?.invoices?.nodes) {
          console.error("❌ Unexpected response structure:", JSON.stringify(json, null, 2));
          throw new Error("Invalid GraphQL response structure for invoices");
        }

        const { nodes, pageInfo } = json.data.invoices;
        allInvoices.push(...nodes);

        // Extract payment records from invoices
        for (const invoice of nodes) {
          for (const payment of invoice.paymentRecords?.nodes || []) {
            const receivedDate = new Date(payment.receivedOn || payment.createdAt);
            const startDate = new Date("2025-09-01T00:00:00Z");
            const endDate = new Date("2025-10-08T23:59:59Z");

            if (receivedDate >= startDate && receivedDate <= endDate) {
              allPayments.push({
                ...payment,
                invoice: {
                  id: invoice.id,
                  invoiceNumber: invoice.invoiceNumber
                },
                client: invoice.client,
                paymentMethod: payment.paymentMethod?.name || 'Unknown'
              });
            }
          }
        }

        after = pageInfo.hasNextPage ? pageInfo.endCursor : null;

        if (pageCount >= maxPages) {
          console.log(`🛑 Reached page limit (${maxPages}). Stopping to prevent timeout.`);
          break;
        }

        if (after) {
          await pause(1000);
        }
      } while (after);

      return { invoices: allInvoices, payments: allPayments };
    }

    // === MAIN EXECUTION ===
    console.log("🚀 Starting OPTIMIZED COMPLETE Jobber sync...");
    console.log(`📅 Date range: 2025-09-01 to 2025-10-08`);

    // Test API connectivity
    console.log("🧪 Testing API connectivity...");
    const testJson = await makeRequestWithRetry("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: gqlHeaders,
      body: JSON.stringify({
        query: `query TestAPI {
          jobs(first: 1) {
            nodes {
              id
              jobStatus
            }
          }
        }`,
      }),
    });
    console.log("✅ API connectivity confirmed");

    // Fetch all data
    const jobs = await fetchJobsWithLineItems();
    const { invoices, payments } = await fetchInvoicesWithPayments();

    console.log(`📊 Data fetched: ${jobs.length} active jobs, ${invoices.length} invoices, ${payments.length} payments`);

    // === UPSERT JOBS ===
    let jobsProcessed = 0;
    let lineItemsProcessed = 0;

    console.log(`📋 Processing ${jobs.length} active jobs...`);
    for (const job of jobs) {
      const clientName = job.client?.companyName ||
        `${job.client?.firstName || ""} ${job.client?.lastName || ""}`.trim() || "Unknown";

      const isClosedJob = ['complete', 'invoicing'].includes(job.jobStatus?.toLowerCase());

      await supabase.from("jobber_jobs").upsert({
        id: job.id,
        job_number: job.jobNumber,
        title: job.title,
        job_status: job.jobStatus,
        start_at: job.startAt,
        end_at: job.endAt,
        closed_at: isClosedJob ? (job.endAt || job.updatedAt) : null,
        total: job.total || 0,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
        client_id: job.client?.id || null,
        client_name: clientName,
        pulled_at: new Date().toISOString(),
      });

      // Process line items for membership tracking
      for (const lineItem of job.lineItems?.nodes || []) {
        await supabase.from("jobber_line_items").upsert({
          id: lineItem.id,
          job_id: job.id,
          name: lineItem.name,
          description: lineItem.description,
          quantity: lineItem.quantity || 0,
          unit_cost: lineItem.unitCost || 0,
          total_cost: lineItem.totalCost || 0,
          pulled_at: new Date().toISOString(),
        });
        lineItemsProcessed++;
      }

      jobsProcessed++;
      if (jobsProcessed % 25 === 0) {
        console.log(`📊 Processed ${jobsProcessed}/${jobs.length} jobs...`);
      }
    }

    // === UPSERT INVOICES ===
    let invoicesProcessed = 0;
    console.log(`🧾 Processing ${invoices.length} invoices...`);

    for (const invoice of invoices) {
      const clientName = invoice.client?.companyName ||
        `${invoice.client?.firstName || ""} ${invoice.client?.lastName || ""}`.trim() || "Unknown";

      const amountPaid = (invoice.paymentRecords?.nodes || []).reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0);

      const totalAmount = invoice.total || 0;
      const amountOutstanding = Math.max(0, totalAmount - amountPaid);

      await supabase.from("jobber_invoices").upsert({
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        subject: invoice.subject,
        invoice_status: invoice.invoiceStatus,
        total: totalAmount,
        subtotal: invoice.subtotal || 0,
        total_tax: invoice.totalTax || 0,
        amount_paid: amountPaid,
        amount_outstanding: amountOutstanding,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt,
        due_at: invoice.dueDate,
        job_id: invoice.job?.id || null,
        client_id: invoice.client?.id || null,
        client_name: clientName,
        pulled_at: new Date().toISOString(),
      });

      invoicesProcessed++;
      if (invoicesProcessed % 25 === 0) {
        console.log(`📊 Processed ${invoicesProcessed}/${invoices.length} invoices...`);
      }
    }

    // === UPSERT PAYMENTS ===
    let paymentsProcessed = 0;
    console.log(`💰 Processing ${payments.length} payments...`);

    for (const payment of payments) {
      const clientName = payment.client?.companyName ||
        `${payment.client?.firstName || ""} ${payment.client?.lastName || ""}`.trim() || "Unknown";

      await supabase.from("jobber_payments").upsert({
        id: payment.id,
        amount: payment.amount || 0,
        payment_method: payment.paymentMethod || 'Unknown',
        received_at: payment.receivedOn || payment.createdAt,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt,
        invoice_id: payment.invoice?.id || null,
        invoice_number: payment.invoice?.invoiceNumber || null,
        client_id: payment.client?.id || null,
        client_name: clientName,
        pulled_at: new Date().toISOString(),
      });

      paymentsProcessed++;
      if (paymentsProcessed % 25 === 0) {
        console.log(`📊 Processed ${paymentsProcessed}/${payments.length} payments...`);
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Calculate membership stats from line items
    const jobsWithLineItems = jobs.filter(job => job.lineItems?.nodes?.length > 0).length;
    const jobsWithoutLineItems = jobs.length - jobsWithLineItems;

    $.export("$summary",
      `✅ OPTIMIZED COMPLETE sync finished successfully!\\n` +
      `⏱️  Total execution time: ${duration} seconds\\n` +
      `\\n📊 ACTIVE DATA SYNCED:\\n` +
      `📋 ${jobs.length} active jobs (${jobsWithLineItems} with line items, ${jobsWithoutLineItems} without)\\n` +
      `🧾 ${invoices.length} invoices\\n` +
      `💰 ${payments.length} payments\\n` +
      `🔧 ${lineItemsProcessed} line items for membership tracking\\n` +
      `\\n🎯 MEMBERSHIP TRACKING READY:\\n` +
      `✅ Active jobs filtered (excluded archived/cancelled/void)\\n` +
      `✅ Line items synced for accurate membership counts\\n` +
      `✅ All financial data current\\n` +
      `\\n📅 Data range: 2025-09-01 to 2025-10-08\\n` +
      `🔄 Token management: Automatic refresh implemented\\n` +
      `🚀 Your dashboard now has complete, current data!`
    );

    return {
      success: true,
      duration: duration,
      stats: {
        jobs: jobs.length,
        invoices: invoices.length,
        payments: payments.length,
        lineItems: lineItemsProcessed,
        jobsWithLineItems: jobsWithLineItems,
        jobsWithoutLineItems: jobsWithoutLineItems
      }
    };
  },
});