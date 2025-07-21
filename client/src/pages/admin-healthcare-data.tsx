import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { HealthcareDataManagement } from "@/components/admin/HealthcareDataManagement";
import { useAuth } from "@/hooks/use-auth";

export default function AdminHealthcareData() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access this page.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <Home className="h-4 w-4 mr-2" />
                  Main Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-navy-blue rounded-lg flex items-center justify-center mr-3">
                  <span className="text-gold font-bold text-sm">C</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Healthcare Data Management</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.firstName} {user?.lastName} • System Administrator
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HealthcareDataManagement />
      </div>
    </div>
  );
}