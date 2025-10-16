import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const hasJobberToken = cookieStore.get('jobber_access_token');
  const hasQuickBooksToken = cookieStore.get('quickbooks_access_token');

  if (hasJobberToken) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Plumbing & HVAC Dashboard
          </h1>
          <p className="text-lg gradient-text mb-8">
            Real-time accountability metrics for your business
          </p>

          <div className="space-y-4">
            {!hasJobberToken && (
              <a
                href="/api/auth/jobber"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Connect to Jobber
              </a>
            )}

            {hasJobberToken && !hasQuickBooksToken && (
              <a
                href="/api/auth/quickbooks"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                Connect to QuickBooks
              </a>
            )}

            {hasJobberToken && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <span>✓</span>
                <span>Jobber Connected</span>
              </div>
            )}

            {hasQuickBooksToken && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <span>✓</span>
                <span>QuickBooks Connected</span>
              </div>
            )}

            {hasJobberToken && hasQuickBooksToken && (
              <a
                href="/dashboard"
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                Go to Dashboard
              </a>
            )}

            <div className="text-sm text-gray-500">
              {!hasJobberToken && "Connect your accounts to start tracking business metrics"}
              {hasJobberToken && !hasQuickBooksToken && "Connect QuickBooks for revenue tracking"}
              {hasJobberToken && hasQuickBooksToken && "All systems connected!"}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-medium gradient-text mb-3">Dashboard Features:</h3>
            <ul className="text-sm gradient-text space-y-1 text-left">
              <li>• Daily revenue target tracking</li>
              <li>• Unsent invoices monitoring</li>
              <li>• Open quotes management</li>
              <li>• Weekly payments vs goals</li>
              <li>• YTD revenue comparison</li>
              <li>• Real-time status indicators</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
