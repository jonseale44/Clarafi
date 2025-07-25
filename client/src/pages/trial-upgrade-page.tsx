import { TrialUpgrade } from '@/components/trial-upgrade';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';

export default function TrialUpgradePage() {
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
                  <span className="text-navy-blue">CLAR</span>
                  <span className="text-gold">A</span>
                  <span className="text-navy-blue">F</span>
                  <span className="text-gold">I</span>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Upgrade Your Account</h1>
            <p className="text-xl text-gray-600">
              Continue using all CLARAFI features with no interruption
            </p>
          </div>

          <TrialUpgrade />
        </div>
      </div>
    </div>
  );
}