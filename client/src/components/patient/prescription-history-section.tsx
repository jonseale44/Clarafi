import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  RefreshCw,
  Printer,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SelectPrescriptionTransmission } from "@shared/schema";

interface PrescriptionHistorySectionProps {
  patientId: number;
}

export default function PrescriptionHistorySection({ patientId }: PrescriptionHistorySectionProps) {
  const { toast } = useToast();

  // Fetch prescription transmission history
  const { data: transmissions = [], isLoading, refetch } = useQuery<SelectPrescriptionTransmission[]>({
    queryKey: [`/api/eprescribing/transmissions/${patientId}`],
  });

  const handleViewPDF = (transmissionId: number) => {
    // Open PDF in new tab
    window.open(`/api/eprescribing/prescription/${transmissionId}/pdf`, '_blank');
  };

  const handleRetryTransmission = async (transmissionId: number) => {
    try {
      const response = await fetch(`/api/eprescribing/transmission/${transmissionId}/retry`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Transmission Retried",
          description: "The prescription has been queued for retransmission",
        });
        refetch();
      } else {
        throw new Error("Failed to retry transmission");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry transmission",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'transmitted':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      case 'queued':
      case 'sending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'electronic':
        return <Send className="h-4 w-4" />;
      case 'fax':
        return <Phone className="h-4 w-4" />;
      case 'print':
        return <Printer className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      transmitted: "default",
      delivered: "default",
      failed: "destructive",
      pending: "secondary",
      queued: "secondary",
      sending: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy-blue-800">Prescription Transmission History</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {transmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No prescriptions have been transmitted yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transmissions.map((item: any) => {
                  const transmission = item.transmission;
                  const medication = item.medication;
                  const pharmacy = item.pharmacy;
                  const provider = item.provider;
                  
                  return (
                    <TableRow key={transmission?.id || `transmission-${Math.random()}`}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(transmission.transmittedAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {medication?.name || "Unknown Medication"}
                          </div>
                          {medication?.strength && (
                            <div className="text-sm text-gray-600">
                              {medication.strength} - {medication.quantity} {medication.quantityUnit}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getMethodIcon(transmission.transmissionMethod)}
                          <span className="capitalize">{transmission.transmissionMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pharmacy?.name || 
                         (transmission.transmissionMethod === 'print' ? 'Printed' : 
                          transmission.transmissionMethod === 'fax' && transmission.pharmacyResponse?.pharmacyName ? 
                           `${transmission.pharmacyResponse.pharmacyName} (Fax: ${transmission.pharmacyResponse.faxNumber})` : 
                           'N/A')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transmission.status)}
                        {transmission.status === 'failed' && 
                         transmission.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {transmission.errorMessage}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPDF(transmission.id)}
                            title="View/Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {transmission.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetryTransmission(transmission.id)}
                              title="Retry Transmission"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}