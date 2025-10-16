// Test script to validate the line items GraphQL query structure
// This can be run independently to test the query before running the full workflow

export default defineComponent({
  async run({ $, steps }) {
    // Mock token for testing - replace with actual token
    const testToken = "your_test_token_here";

    const gqlHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testToken}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    };

    console.log("🧪 Testing line items GraphQL query structure...");

    try {
      // Test 1: Simple jobs query (should work)
      console.log("1️⃣ Testing basic jobs query...");
      const basicResponse = await fetch("https://api.getjobber.com/api/graphql", {
        method: "POST",
        headers: gqlHeaders,
        body: JSON.stringify({
          query: `query TestBasic {
            jobs(first: 1) {
              nodes {
                id
                jobNumber
                jobStatus
              }
            }
          }`,
        }),
      });

      const basicJson = await basicResponse.json();
      console.log("✅ Basic query result:", JSON.stringify(basicJson, null, 2));

      if (basicJson.errors) {
        console.error("❌ Basic query failed:", basicJson.errors);
        return;
      }

      // Test 2: Jobs with line items query
      console.log("2️⃣ Testing jobs with line items query...");
      const lineItemsResponse = await fetch("https://api.getjobber.com/api/graphql", {
        method: "POST",
        headers: gqlHeaders,
        body: JSON.stringify({
          query: `query TestLineItems {
            jobs(first: 1) {
              nodes {
                id
                jobNumber
                jobStatus
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
            }
          }`,
        }),
      });

      const lineItemsJson = await lineItemsResponse.json();
      console.log("✅ Line items query result:", JSON.stringify(lineItemsJson, null, 2));

      if (lineItemsJson.errors) {
        console.error("❌ Line items query failed:", lineItemsJson.errors);
        return;
      }

      // Test 3: Full query with filters (our actual query)
      console.log("3️⃣ Testing full filtered query...");
      const fullResponse = await fetch("https://api.getjobber.com/api/graphql", {
        method: "POST",
        headers: gqlHeaders,
        body: JSON.stringify({
          query: `query TestFull($createdAtGte: DateTime) {
            jobs(
              first: 1
              filter: { createdAtGte: $createdAtGte }
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
          variables: { createdAtGte: "2025-09-01T00:00:00Z" },
        }),
      });

      const fullJson = await fullResponse.json();
      console.log("✅ Full query result:", JSON.stringify(fullJson, null, 2));

      if (fullJson.errors) {
        console.error("❌ Full query failed:", fullJson.errors);
        return;
      }

      console.log("🎉 All GraphQL query tests passed!");

      $.export("$summary", "✅ GraphQL query structure validation completed successfully!");

    } catch (error) {
      console.error("❌ Test failed with error:", error);
      $.export("$summary", `❌ GraphQL test failed: ${error.message}`);
    }
  },
});