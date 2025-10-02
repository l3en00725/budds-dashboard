'use client';

import { useState } from 'react';

export default function TestLineItems() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLineItems = async () => {
    setLoading(true);
    try {
      // Get token from cookie
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const token = getCookie('jobber_access_token');
      if (!token) {
        setResult('❌ No token found. Please authenticate at /dashboard first.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/test-lineitems', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Test Jobber Line Items Support
        </h1>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-4">
            This test checks if Jobber's GraphQL API supports line items in jobs queries.
            This will help us determine if we can properly count active memberships.
          </p>

          <button
            onClick={testLineItems}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                Testing...
              </>
            ) : (
              'Test Line Items API'
            )}
          </button>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {result}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What we're testing:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Can we query <code>lineItems</code> field on jobs?</li>
            <li>• Do line items contain <code>name</code>, <code>description</code> fields?</li>
            <li>• Can we filter for "Budd's membership" line items?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}