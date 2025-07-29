import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function BusinessAssociateAgreement() {
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
              Business Associate Agreement (BAA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-md border p-6">
              <div className="prose prose-sm max-w-none">
                <h2>HIPAA Business Associate Agreement</h2>
                <p className="text-sm text-gray-600">Effective Date: January 1, 2025</p>
                
                <h3>1. Definitions</h3>
                <p>
                  Terms used, but not otherwise defined, in this Agreement shall have the same meaning as those terms in the HIPAA Rules.
                </p>
                
                <h3>2. Obligations and Activities of Business Associate</h3>
                <p>
                  Business Associate agrees to:
                </p>
                <ul>
                  <li>Not use or disclose protected health information other than as permitted or required by the Agreement or as required by law;</li>
                  <li>Use appropriate safeguards, and comply with Subpart C of 45 CFR Part 164 with respect to electronic protected health information, to prevent use or disclosure of protected health information other than as provided for by the Agreement;</li>
                  <li>Report to covered entity any use or disclosure of protected health information not provided for by the Agreement of which it becomes aware, including breaches of unsecured protected health information as required at 45 CFR 164.410;</li>
                  <li>In accordance with 45 CFR 164.502(e)(1)(ii) and 164.308(b)(2), if applicable, ensure that any subcontractors that create, receive, maintain, or transmit protected health information on behalf of the business associate agree to the same restrictions, conditions, and requirements that apply to the business associate;</li>
                  <li>Implement technical controls, including rate limits, to prevent bulk or automated data extraction from the Service;</li>
                  <li>Cooperate with lawful requests from covered entities or regulators for patient access or breach investigation purposes;</li>
                </ul>
                
                <h3>2A. Manual Upload Requirements and User Attestations</h3>
                <p>
                  All document, image, and screenshot uploads to the Service must be manually selected and initiated by the user. Business Associate does not perform automated or scripted extraction from third-party systems. Users must:
                </p>
                <ul>
                  <li>Manually select and upload all files, documents, images, and screenshots;</li>
                  <li>Confirm they are not violating the terms of service, licensing agreements, or policies of any source electronic medical record (EMR) or software when capturing and uploading content;</li>
                  <li>Acknowledge full authorization to capture and submit information according to all applicable policies and laws;</li>
                  <li>Accept responsibility for any claims arising from violations of third-party software or vendor agreements resulting from content they upload;</li>
                </ul>
                
                <h3>3. Permitted Uses and Disclosures by Business Associate</h3>
                <p>
                  Business Associate may only use or disclose protected health information:
                </p>
                <ul>
                  <li>As necessary to perform the services set forth in the underlying service agreement;</li>
                  <li>As required by law;</li>
                  <li>For the proper management and administration of business associate or to carry out the legal responsibilities of the business associate, provided the disclosures are required by law;</li>
                </ul>
                
                <h3>4. Provisions for Covered Entity to Inform Business Associate of Privacy Practices and Restrictions</h3>
                <ul>
                  <li>Covered entity shall notify business associate of any limitation(s) in the notice of privacy practices of covered entity under 45 CFR 164.520;</li>
                  <li>Covered entity shall notify business associate of any changes in, or revocation of, the permission by an individual to use or disclose his or her protected health information;</li>
                  <li>Covered entity shall notify business associate of any restriction on the use or disclosure of protected health information that covered entity has agreed to or is required to abide by under 45 CFR 164.522;</li>
                </ul>
                
                <h3>5. Permissible Requests by Covered Entity</h3>
                <p>
                  Covered entity shall not request business associate to use or disclose protected health information in any manner that would not be permissible under Subpart E of 45 CFR Part 164 if done by covered entity.
                </p>
                
                <h3>6. Term and Termination</h3>
                <ul>
                  <li>This Agreement shall be effective as of the date signed and shall terminate on the date that all protected health information is destroyed or returned to covered entity;</li>
                  <li>Upon termination of this Agreement for any reason, business associate shall return to covered entity or destroy all protected health information received from covered entity;</li>
                </ul>
                
                <h3>7. Miscellaneous</h3>
                <ul>
                  <li>A reference in this Agreement to a section in the HIPAA Rules means the section as in effect or as amended;</li>
                  <li>The Parties agree to take such action as is necessary to amend this Agreement from time to time as is necessary for compliance with the requirements of the HIPAA Rules;</li>
                  <li>Any ambiguity in this Agreement shall be interpreted to permit compliance with the HIPAA Rules;</li>
                  <li>This Agreement is consistent with the Service's Terms of Service and Privacy Policy regarding HIPAA compliance, data security, and the use of AI or automated systems for parsing uploaded files (but not for data extraction from external systems);</li>
                </ul>
                
                <div className="mt-8 p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-600">
                    By accepting this Business Associate Agreement during the sign-up process, you acknowledge that you have read, understood, and agree to be bound by the terms and conditions set forth herein.
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