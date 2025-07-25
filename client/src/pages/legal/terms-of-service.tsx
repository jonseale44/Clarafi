import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-3xl font-bold cursor-pointer">
              <span className="text-[#1e3a8a]">CLAR</span>
              <span className="text-[#fbbf24]">A</span>
              <span className="text-[#1e3a8a]">F</span>
              <span className="text-[#fbbf24]">I</span>
            </h1>
          </Link>
          <Link href="/auth">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign Up
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4">
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Terms of Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-md border p-6">
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-600">Last Updated: January 1, 2025</p>
                
                <h3>1. Acceptance of Terms</h3>
                <p>
                  By accessing and using this medical transcription platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
                </p>
                
                <h3>2. Use License</h3>
                <p>
                  Permission is granted to temporarily use the Service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul>
                  <li>modify or copy the materials;</li>
                  <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                  <li>attempt to decompile or reverse engineer any software contained in the Service;</li>
                  <li>remove any copyright or other proprietary notations from the materials.</li>
                </ul>
                
                <h3>3. Healthcare Professional Requirements</h3>
                <p>
                  This Service is exclusively for licensed healthcare professionals. By using this Service, you represent and warrant that:
                </p>
                <ul>
                  <li>You are a licensed healthcare professional in good standing;</li>
                  <li>You will only use the Service for legitimate medical documentation purposes;</li>
                  <li>You will comply with all applicable healthcare laws and regulations, including HIPAA;</li>
                  <li>You will maintain the confidentiality of all patient information.</li>
                </ul>
                
                <h3>4. Data Processing and Privacy</h3>
                <p>
                  We are committed to protecting your privacy and the privacy of patient information:
                </p>
                <ul>
                  <li>All data is encrypted in transit and at rest;</li>
                  <li>We comply with HIPAA and other applicable healthcare privacy regulations;</li>
                  <li>Patient data is processed solely for the purpose of providing transcription and documentation services;</li>
                  <li>We do not sell or share patient data with third parties except as required by law.</li>
                </ul>
                
                <h3>5. Medical Disclaimer</h3>
                <p>
                  The Service provides transcription and documentation assistance only. It does not:
                </p>
                <ul>
                  <li>Provide medical advice, diagnosis, or treatment recommendations;</li>
                  <li>Replace professional medical judgment;</li>
                  <li>Guarantee the accuracy of AI-generated transcriptions or suggestions;</li>
                </ul>
                <p>
                  Healthcare professionals are solely responsible for reviewing, verifying, and approving all documentation before use in patient care.
                </p>
                
                <h3>6. Payment and Subscription</h3>
                <ul>
                  <li>Subscription fees are billed monthly in advance;</li>
                  <li>All fees are non-refundable except as required by law;</li>
                  <li>We reserve the right to modify pricing with 30 days' notice;</li>
                  <li>Failure to pay may result in suspension or termination of service.</li>
                </ul>
                
                <h3>7. Intellectual Property</h3>
                <p>
                  The Service and its original content, features, and functionality are and will remain the exclusive property of the company and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
                
                <h3>8. Limitation of Liability</h3>
                <p>
                  In no event shall our company, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
                </p>
                
                <h3>9. Indemnification</h3>
                <p>
                  You agree to defend, indemnify, and hold harmless the company and its licensees and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees).
                </p>
                
                <h3>10. Termination</h3>
                <p>
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
                
                <h3>11. Governing Law</h3>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>
                
                <h3>12. Changes to Terms</h3>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                
                <h3>13. Contact Information</h3>
                <p>
                  If you have any questions about these Terms, please contact us at legal@medicalplatform.com.
                </p>
                
                <div className="mt-8 p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-600">
                    By accepting these Terms of Service during the sign-up process, you acknowledge that you have read, understood, and agree to be bound by all of the terms and conditions contained herein.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}