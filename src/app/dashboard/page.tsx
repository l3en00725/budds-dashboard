import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Budd's Dashboard
                </h1>
                <p className="text-sm text-gray-500">Plumbing & HVAC Operations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Business Overview</h2>
          <p className="text-gray-600">Real-time insights into your operations and performance</p>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4 mb-4"></div>
          <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2 mb-2"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/3"></div>
        </div>
      ))}
    </div>
  );
}