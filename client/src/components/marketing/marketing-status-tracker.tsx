import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

interface ModuleStatus {
  module: string;
  status: "DONE" | "IN PROGRESS" | "TODO" | "STUB";
  hasRealData: boolean;
  nextAction: string;
}

const moduleStatuses: ModuleStatus[] = [
  {
    module: "Acquisition Tracking",
    status: "DONE",
    hasRealData: true,
    nextAction: "—"
  },
  {
    module: "Conversion Tracking",
    status: "STUB",
    hasRealData: false,
    nextAction: "Track and display all funnel events"
  },
  {
    module: "Dashboard Metrics",
    status: "STUB",
    hasRealData: false,
    nextAction: "Plug in real conversion math"
  },
  {
    module: "AI Insights",
    status: "STUB",
    hasRealData: false,
    nextAction: "Plug in GPT/rule analytics"
  },
  {
    module: "Automations",
    status: "STUB",
    hasRealData: false,
    nextAction: "Add rule execution tied to real triggers"
  },
  {
    module: "Campaigns/ROI",
    status: "STUB",
    hasRealData: false,
    nextAction: "Integrate spend/conversion, compute ROI"
  }
];

export default function MarketingStatusTracker() {
  const getStatusBadge = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "DONE":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            DONE
          </Badge>
        );
      case "IN PROGRESS":
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            IN PROGRESS
          </Badge>
        );
      case "TODO":
        return (
          <Badge className="bg-gray-500 text-white">
            <AlertCircle className="h-3 w-3 mr-1" />
            TODO
          </Badge>
        );
      case "STUB":
        return (
          <Badge className="bg-orange-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            STUB
          </Badge>
        );
    }
  };

  const getRealDataIcon = (hasRealData: boolean) => {
    return hasRealData ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          YOUR STATUS AT A GLANCE
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Real Data?</TableHead>
              <TableHead>Next Action Needed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moduleStatuses.map((item) => (
              <TableRow key={item.module}>
                <TableCell className="font-medium">{item.module}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-center">
                  {getRealDataIcon(item.hasRealData)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.nextAction}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}