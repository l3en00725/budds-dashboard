export interface JobberClient {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface JobberJob {
  id: string;
  jobNumber: string;
  title: string;
  description?: string;
  client: JobberClient;
  status: 'draft' | 'needs_scheduling' | 'scheduled' | 'active' | 'invoicing' | 'complete' | 'cancelled';
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  totalAmount?: number;
  lineItems?: JobberLineItem[];
}

export interface JobberLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface JobberInvoice {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'paid' | 'bad_debt';
  client: JobberClient;
  job?: JobberJob;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  lineItems: JobberLineItem[];
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  activeJobs: number;
  completedJobs: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  averageJobValue: number;
  clientCount: number;
}

export interface JobberApiResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
  }>;
}