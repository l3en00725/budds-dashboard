# Jobber Payment Schema Fix

## Problem
The original Pipedream workflow and API routes were using a direct `payments` query in Jobber's GraphQL API, which doesn't exist. This caused the following error:

```
GraphQL Error: [{"message":"Field 'payments' doesn't exist on type 'Query' (Did you mean `paymentMethods`?)","locations":[{"line":3,"column":17}],"path":["query GetPayments","payments"],"extensions":{"code":"undefinedField","typeName":"Query","fieldName":"payments"}}]
```

## Root Cause
Jobber's GraphQL API doesn't provide a direct `payments` query at the root level. Instead, payment data is accessed through `paymentRecords` nested under invoices.

## Solution Overview
Updated all payment-related queries to access payment data through the correct Jobber API structure:

1. **Direct `payments` query** ❌ → **`invoices` with `paymentRecords`** ✅
2. **Date filtering on payments** → **Date filtering on invoices with client-side payment filtering**
3. **Added support for unallocated deposits** through `unallocatedDepositRecords`

## Files Modified

### 1. `/pipedream-workflows/jobber-corrected-filters.mjs`
**Changes:**
- Replaced `fetchPayments()` with `fetchPaymentRecords()` that gets payment records through invoices
- Added `fetchUnallocatedPayments()` for unallocated deposits
- Updated invoice queries to include payment records for accurate amount calculations
- Enhanced date filtering to use range: 2025-09-01 to 2025-10-08
- Added API test before sync to validate schema access

**Key Query Changes:**
```graphql
# OLD (❌ - doesn't exist)
query GetPayments($after: String) {
  payments(first: 20, after: $after) { ... }
}

# NEW (✅ - correct approach)
query GetInvoicesWithPayments($after: String) {
  invoices(first: 20, after: $after, filter: { ... }) {
    nodes {
      paymentRecords {
        nodes {
          id
          amount
          receivedOn
          paymentMethod { name }
        }
      }
    }
  }
}
```

### 2. `/src/app/api/jobber/payments/route.ts`
**Changes:**
- Updated query from `GET_PAYMENTS_QUERY` to `GET_PAYMENT_RECORDS_QUERY`
- Changed filter logic to use invoice date filtering
- Added response processing to extract and format payment records
- Updated API version to `2025-01-20`
- Maintained backward compatibility by formatting response like old payments structure

### 3. `/src/app/api/sync/jobber/route.ts`
**Changes:**
- Updated `syncJobberPayments()` function to use invoice-based payment record fetching
- Changed query structure to get payment records through invoices
- Added rate limiting delays between payment record requests
- Updated field mapping to use `receivedOn` instead of `paymentDate`

### 4. `/src/types/jobber.ts`
**Changes:**
- Added `JobberPaymentMethod` interface
- Added `JobberPaymentRecord` interface for nested payment records
- Updated `JobberInvoice` to include optional `paymentRecords`
- Added `JobberPayment` interface for formatted payment responses

### 5. `/test-jobber-payments.mjs` (New File)
**Purpose:**
- Test script to validate the corrected GraphQL schema
- Tests API connectivity, invoice payment records, unallocated deposits
- Helps verify schema changes before deployment

## Key Schema Differences

| Field | Old Direct Query | New Invoice-Nested Query |
|-------|------------------|--------------------------|
| Payment ID | `payment.id` | `paymentRecord.id` |
| Amount | `payment.amount` | `paymentRecord.amount` |
| Date | `payment.paymentDate` | `paymentRecord.receivedOn` |
| Method | `payment.paymentMethod` | `paymentRecord.paymentMethod.name` |
| Invoice | `payment.invoice.id` | `invoice.id` (parent) |

## Benefits of This Fix

1. **Eliminates GraphQL Errors**: No more "field doesn't exist" errors
2. **Accurate Payment Data**: Gets actual payment records from Jobber
3. **Better Invoice Integration**: Automatically calculates paid/outstanding amounts
4. **Historical Data**: Extended date range to September 1st for proper metrics
5. **Unallocated Payments**: Attempts to capture payments not tied to invoices

## Dashboard Metrics Impact

The corrected payment data will now properly support:

- ✅ **Daily Closed Job Revenue**: Based on actual job completion and payment data
- ✅ **Month-to-Date Issued/Collected Revenue**: From invoice creation and payment records
- ✅ **Previous Month Issued/Collected Revenue**: Historical data from September
- ✅ **Accounts Receivable Outstanding**: Calculated from invoice totals minus payments
- ✅ **Active Membership Count**: Derived from line item analysis

## Testing

Run the test script to validate the fix:
```bash
node test-jobber-payments.mjs
```

This will verify:
1. Basic API connectivity
2. Invoice payment records access
3. Payment method structure
4. Unallocated deposit availability (if supported)

## Deployment Notes

1. **API Version**: Updated to `2025-01-20` for latest schema support
2. **Rate Limiting**: Added conservative delays between requests
3. **Error Handling**: Enhanced GraphQL error detection and reporting
4. **Backward Compatibility**: Payment API route maintains same response format

## Expected Results

After deployment, the sync should successfully:
- Pull payment data from September 2025 forward
- Calculate accurate revenue metrics
- Display proper accounts receivable balances
- Show realistic month-over-month trends

This fix addresses the core issue preventing accurate financial dashboard data from Jobber.