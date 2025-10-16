import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Modern Purple Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                <span className="text-white font-bold text-2xl gradient-text">B</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white gradient-text mb-1">
                  Budd's Dashboard
                </h1>
                <p className="text-sm text-white/90">Plumbing & HVAC Operations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
              <span className="text-sm text-white font-semibold">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold gradient-text mb-2">Business Overview</h2>
          <p className="text-lg gradient-text">Real-time insights into your operations and performance</p>
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