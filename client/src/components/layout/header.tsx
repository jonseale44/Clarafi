import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, Bell } from "lucide-react";

interface HeaderProps {
  onStartVoiceRecording: () => void;
  onPatientSearch: (patientId: number) => void;
}

export function Header({ onStartVoiceRecording, onPatientSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // In a real app, this would search patients by MRN or name
      // For now, we'll just use a default patient ID
      onPatientSearch(1);
    }
  };

  return (
    <header className="bg-surface border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-gray-900">Patient Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Live
            </Badge>
            <span className="text-sm text-gray-500">
              {currentDate} | {currentTime}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Global Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search patients, MRN, or records..."
              className="pl-10 pr-4 py-2 w-80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          
          {/* Voice Recording Quick Access */}
          <Button 
            onClick={onStartVoiceRecording}
            className="bg-primary text-white hover:bg-blue-700"
          >
            <Mic className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
          
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
