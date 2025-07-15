import { useState } from "react";
import { CalendarView } from "@/components/scheduling/calendar-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Settings, Users, Brain } from "lucide-react";

export default function SchedulingPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<number | undefined>();
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  
  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          Intelligent Scheduling System
        </h1>
        <p className="text-gray-600 mt-2">
          AI-powered appointment scheduling that learns and adapts to your practice patterns
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Provider Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              View and manage provider availability across all locations
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Manage Providers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Adjust AI prediction factors and scheduling intelligence
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Configure AI
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Schedule Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Set buffer times, appointment types, and scheduling rules
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Edit Preferences
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarView 
            providerId={selectedProviderId}
            locationId={selectedLocationId}
          />
        </CardContent>
      </Card>
    </div>
  );
}