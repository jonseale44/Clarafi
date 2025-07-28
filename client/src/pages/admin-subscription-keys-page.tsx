import { AdminSubscriptionKeys } from '@/components/admin-subscription-keys';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';

export function AdminSubscriptionKeysPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ChevronLeft className="h-5 w-5" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
            </Link>
            <div className="flex-1" />
            <Link href="/dashboard">
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="font-bold text-2xl">
                  <span className="text-[#1e3a8a]">CLAR</span>
                  <span className="text-[#fbbf24]">A</span>
                  <span className="text-[#1e3a8a]">F</span>
                  <span className="text-[#fbbf24]">I</span>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto p-6">
        <AdminSubscriptionKeys />
      </div>
    </div>
  );
}