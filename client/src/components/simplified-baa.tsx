import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, CheckCircle } from "lucide-react";

interface SimplifiedBAAProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function SimplifiedBAA({ open, onClose, onAccept }: SimplifiedBAAProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl">HIPAA Compliance Agreement</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            As a healthcare provider, you're already familiar with HIPAA requirements. 
            This quick agreement ensures we handle patient data according to HIPAA standards.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] mt-4 pr-4">
          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">What This Means for You</h3>
              <p className="text-blue-800">
                By accepting, you confirm that you have the authority to use patient data in Clarafi
                and that you'll follow HIPAA regulations - just like you do in your practice every day.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Your HIPAA Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Only access patient records you're authorized to view</li>
                <li>Keep your login credentials secure and confidential</li>
                <li>Log out when you're done with patient records</li>
                <li>Report any suspected security issues immediately</li>
                <li>Only use Clarafi for legitimate healthcare purposes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">How Clarafi Protects Patient Data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>All data is encrypted during transmission and storage</li>
                <li>We maintain detailed audit logs of all access</li>
                <li>Regular security assessments and updates</li>
                <li>Automatic session timeouts for security</li>
                <li>HIPAA-compliant infrastructure and procedures</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Permitted Uses</h3>
              <p className="mb-2">You may use Clarafi to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Document patient encounters and clinical notes</li>
                <li>Order labs, medications, and imaging studies</li>
                <li>Review patient histories and test results</li>
                <li>Coordinate care with other authorized providers</li>
                <li>Generate necessary reports and documentation</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Important Limitations</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Do not share login credentials with anyone</li>
                <li>Do not access records of patients not under your care</li>
                <li>Do not use patient data for non-healthcare purposes</li>
                <li>Do not attempt to download or export data in bulk</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Your Attestation</h3>
              <p className="text-sm">
                By clicking "I Accept", you attest that:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
                <li>You are a licensed healthcare provider or authorized staff</li>
                <li>You have authority to access patient information</li>
                <li>You will comply with all HIPAA requirements</li>
                <li>You understand your responsibilities for patient privacy</li>
                <li>You will immediately report any security concerns</li>
              </ul>
            </div>

            <div className="text-xs text-gray-600 mt-4">
              <p className="mb-2">
                <strong>Note:</strong> This simplified agreement is designed for individual healthcare 
                providers using Clarafi independently. Healthcare organizations requiring enterprise 
                features will need to execute a full Business Associate Agreement (BAA).
              </p>
              <p>
                For questions about HIPAA compliance or to report security concerns, 
                contact us at hipaa@clarafi.com
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onAccept} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            I Accept HIPAA Requirements
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}