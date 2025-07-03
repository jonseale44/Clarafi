import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Maximize2, Minimize2, Info } from "lucide-react";
import { useDenseView } from "@/hooks/use-dense-view";
import { Card, CardContent } from "@/components/ui/card";

interface DenseViewToggleProps {
  showCard?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DenseViewToggle({ 
  showCard = false, 
  size = "md",
  className = "" 
}: DenseViewToggleProps) {
  const { isDenseView, toggleDenseView, isToggling } = useDenseView();

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2", 
    lg: "text-base px-4 py-3"
  };

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {isDenseView ? (
          <Minimize2 className="h-4 w-4 text-navy-blue-600" />
        ) : (
          <Maximize2 className="h-4 w-4 text-gray-500" />
        )}
        <Label htmlFor="dense-view-toggle" className="text-sm font-medium cursor-pointer">
          Dense View
        </Label>
      </div>
      
      <Switch
        id="dense-view-toggle"
        checked={isDenseView}
        onCheckedChange={toggleDenseView}
        disabled={isToggling}
        className="data-[state=checked]:bg-navy-blue-600"
      />
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Info className="h-3 w-3 text-gray-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">Dense View Mode</p>
              <p>Toggles between spacious cards and compact list format across all chart sections:</p>
              <ul className="mt-1 space-y-1">
                <li>• Medical Problems</li>
                <li>• Medications</li>
                <li>• Allergies</li>
                <li>• Vitals</li>
                <li>• Lab Results</li>
                <li>• Family History</li>
                <li>• Social History</li>
                <li>• Surgical History</li>
                <li>• Documents & Attachments</li>
              </ul>
              <p className="mt-2 text-gray-600">Dense view shows more information with minimal white space, similar to traditional medical charts.</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  if (showCard) {
    return (
      <Card className="border-navy-blue-200 bg-navy-blue-50/30 dark:bg-navy-blue-950/20 dark:border-navy-blue-800">
        <CardContent className={sizeClasses[size]}>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}