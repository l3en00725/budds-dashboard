# Budd's Dashboard

Executive dashboard for plumbing and HVAC businesses integrating Jobber CRM and OpenPhone. Features real-time financial metrics, month-over-month trends, AR aging, and call analytics with automated data sync.

## 🚀 Features

### Executive Metrics
- **Daily Revenue Tracking** - Real-time revenue with $13K daily goal
- **Month-over-Month Trends** - Invoice and payment growth comparisons
- **Completion Rate** - Job completion efficiency (76% current)
- **Jobs per Tech** - Technician productivity metrics
- **AR Aging Analysis** - Outstanding balance breakdown by age

### Financial Dashboard
- **Revenue Issued MTD** - Monthly invoice totals with growth percentages
- **Revenue Collected MTD** - Payment collection tracking
- **Outstanding Balance** - Real-time AR management
- **Growth Indicators** - Visual status indicators (green/orange/red)

### Call Intelligence
- **OpenPhone Integration** - Automated call data sync
- **Lead Tracking** - Call-to-booking conversion rates
- **Daily/Weekly Analytics** - Call volume and booking trends

### Membership Program
- **Membership Analysis** - Silver, Gold, Platinum tier tracking
- **Revenue Attribution** - Membership-based revenue analysis
- **Growth Tracking** - Membership program performance

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Integrations**:
  - Jobber API (GraphQL)
  - OpenPhone API (REST)
- **Authentication**: OAuth 2.0 with automatic token refresh

## 📊 Data Sources

### Jobber CRM
- **Jobs Data** - Service calls, completion status, revenue
- **Invoice Data** - Billing information, payment status
- **Payment Data** - Collection tracking, payment methods
- **Client Data** - Customer information and history

### OpenPhone
- **Call Data** - Inbound/outbound calls, duration
- **Lead Tracking** - Call classification and booking status
- **Analytics** - Call volume trends and conversion rates

## 🔄 Sync Configuration

Dashboard data refreshes automatically:

- **Business Hours (8 AM - 5 PM)**: Every 5 minutes
- **After Hours**: Every 30 minutes
- **Manual Sync**: Available via dashboard button

### API Sync Schedules
- **Jobber Financial**: Daily at 1:00 AM (twice daily during month-end)
- **OpenPhone Calls**: Daily at 6:00 AM (3-day lookback)
- **Membership Analysis**: Weekly on Sunday at 2:00 AM

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Jobber API credentials
- OpenPhone API credentials

### Environment Variables
```bash
# Jobber Configuration
JOBBER_CLIENT_ID=your_client_id
JOBBER_CLIENT_SECRET=your_client_secret
JOBBER_REDIRECT_URI=http://localhost:3000/api/auth/jobber/callback

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenPhone Configuration
OPENPHONE_API_KEY=your_api_key
OPENPHONE_PHONE_NUMBER_ID=your_phone_number_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/budds-dashboard.git
   cd budds-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the dashboard**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📈 Current Metrics (Demo Data)

- **September 2025**: 258 invoices ($217,307), 345 payments ($251,477)
- **August 2025**: 220 invoices ($185,000), 280 payments ($195,000)
- **Growth**: +17% invoiced, +29% collected
- **Outstanding AR**: $34,170 (15% of invoiced amount)

## 🔧 API Endpoints

### Sync Endpoints
- `POST /api/sync/jobber-financial` - Sync invoices and payments
- `POST /api/sync/openphone` - Sync call data
- `GET /api/dashboard/metrics` - Get all dashboard metrics

### Debug Endpoints
- `GET /api/debug/data` - View database contents
- `GET /api/debug/auth-status` - Check authentication status
- `GET /api/debug/revenue-validation` - Validate revenue calculations

### Test Data Endpoints
- `POST /api/realistic-data` - Generate realistic September data
- `POST /api/august-data` - Generate August comparison data

## 📱 Dashboard Sections

### Executive Dashboard
- **Revenue Cards** - Daily, MTD issued/collected with trends
- **Efficiency Metrics** - Completion rates and productivity
- **Financial Health** - AR aging and growth indicators

### Membership Program
- **Tier Analysis** - Silver (77), Gold (26), Platinum (103)
- **Revenue Tracking** - Membership-based revenue attribution
- **Growth Trends** - Program expansion metrics

### Call Intelligence
- **Daily Analytics** - Today's call volume and bookings
- **Weekly Trends** - Week-over-week performance
- **Conversion Rates** - Lead-to-booking percentages

## 🔐 Authentication Flow

1. **Initial Setup** - Navigate to `/api/auth/jobber` for OAuth
2. **Token Storage** - Secure cookie-based token management
3. **Auto Refresh** - Automatic token renewal before expiration
4. **Fallback** - Manual re-authentication prompts when needed

## 🧪 Testing

The dashboard includes realistic test data for development:

```bash
# Generate realistic September data (258 invoices, 345 payments)
curl -X POST http://localhost:3000/api/realistic-data

# Generate August comparison data (220 invoices, 280 payments)
curl -X POST http://localhost:3000/api/august-data
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Environment-Specific Configs
- **Development**: Manual sync, verbose logging
- **Production**: Automated sync schedules, error monitoring

## 📋 Roadmap

- [ ] Real-time WebSocket updates
- [ ] Mobile-responsive design
- [ ] Export functionality (PDF/Excel)
- [ ] Custom date range filtering
- [ ] Multi-location support
- [ ] Advanced forecasting

## 🤝 Contributing

This dashboard was built specifically for Budd's Plumbing & HVAC business needs. For modifications or custom implementations, please reach out.

## 📄 License

Private business application. All rights reserved.

---

**Built with ❤️ for Budd's Plumbing & HVAC**

*Powered by Next.js, Supabase, Jobber API, and OpenPhone*