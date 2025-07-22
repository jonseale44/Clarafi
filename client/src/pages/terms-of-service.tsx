import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <Link href="/auth">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: January 22, 2025</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6 text-sm">
                <section>
                  <h2 className="text-lg font-semibold mb-3">1. ACCEPTANCE OF TERMS</h2>
                  <p className="mb-3">
                    By accessing or using Clarafi ("Service"), you ("User") agree to be bound by these Terms of Service ("Terms"). 
                    If you do not agree to these Terms, do not use the Service.
                  </p>
                  <p className="mb-3 font-semibold">
                    IMPORTANT: By using this Service, you represent and warrant that you have full legal authority to access, 
                    upload, and process any patient information or medical records you submit to Clarafi.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">2. USER RESPONSIBILITIES AND AUTHORITY</h2>
                  
                  <h3 className="font-semibold mb-2">2.1 Authority to Use Service</h3>
                  <p className="mb-3">You represent and warrant that:</p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>You are a licensed healthcare provider or authorized healthcare professional</li>
                    <li>You have full authority to upload, access, and process any patient data you submit to Clarafi</li>
                    <li>Your use of Clarafi complies with all applicable laws, regulations, and your employer's policies</li>
                    <li>You will only upload patient data for patients you have a legitimate treatment relationship with</li>
                  </ul>

                  <h3 className="font-semibold mb-2">2.2 Multiple Practice Locations</h3>
                  <p className="mb-3">
                    If you provide services at multiple locations (clinics, hospitals, or other healthcare facilities), 
                    you represent that you have appropriate authority at EACH location to:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Document patient encounters occurring at that location</li>
                    <li>Access and upload medical records from that location</li>
                    <li>Use third-party services for patient documentation at that location</li>
                  </ul>
                  <p className="mb-3 font-semibold">
                    You are solely responsible for ensuring you have proper authorization at each practice location 
                    before uploading any patient data from that location.
                  </p>

                  <h3 className="font-semibold mb-2">2.3 Compliance Responsibility</h3>
                  <p className="mb-3">
                    You acknowledge and agree that you are solely responsible for:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Obtaining any required approvals from your employer(s) before using Clarafi</li>
                    <li>Ensuring your use complies with HIPAA and all applicable privacy laws</li>
                    <li>Verifying that your employer's policies permit use of third-party documentation tools</li>
                    <li>Maintaining appropriate Business Associate Agreements if required by your organization</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">3. DATA HANDLING AND OWNERSHIP</h2>
                  
                  <h3 className="font-semibold mb-2">3.1 Data Processing</h3>
                  <p className="mb-3">
                    Clarafi processes healthcare data as a service provider. You maintain all rights and responsibilities 
                    for the patient data you upload. Clarafi does not claim ownership of your patient data.
                  </p>

                  <h3 className="font-semibold mb-2">3.2 Data Migration Rights</h3>
                  <p className="mb-3">
                    If your healthcare organization later adopts Clarafi at an enterprise level:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Data you created may be migrated to your organization's Clarafi instance</li>
                    <li>Your organization will have custody rights to patient records created during your employment</li>
                    <li>Migration will occur only after proper Business Associate Agreements are in place</li>
                  </ul>

                  <h3 className="font-semibold mb-2">3.3 Uploaded Documents</h3>
                  <p className="mb-3">
                    By uploading any medical records, images, or documents, you certify that:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>You have legal authority to upload and process these documents</li>
                    <li>The upload complies with all applicable privacy laws and regulations</li>
                    <li>You have obtained any necessary patient consents if required</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">4. INDEMNIFICATION</h2>
                  <p className="mb-3 font-semibold">
                    YOU AGREE TO INDEMNIFY, DEFEND, AND HOLD HARMLESS CLARAFI, ITS OFFICERS, DIRECTORS, EMPLOYEES, 
                    AND AGENTS FROM ANY AND ALL CLAIMS, DAMAGES, LOSSES, LIABILITIES, COSTS, AND EXPENSES (INCLUDING 
                    REASONABLE ATTORNEYS' FEES) ARISING FROM:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Your breach of these Terms</li>
                    <li>Your violation of any law or regulation</li>
                    <li>Your violation of any rights of a third party</li>
                    <li>Your unauthorized use of the Service</li>
                    <li>Any claim that you lacked authority to upload or process patient data</li>
                    <li>Your violation of your employer's policies or agreements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">5. SERVICE TIERS</h2>
                  
                  <h3 className="font-semibold mb-2">5.1 Individual Provider Tier (Tier 1)</h3>
                  <p className="mb-3">
                    Individual providers using Clarafi independently are solely responsible for ensuring compliance 
                    with all applicable laws and employer policies. No Business Associate Agreement is provided at this tier.
                  </p>

                  <h3 className="font-semibold mb-2">5.2 Enterprise Tier (Tier 2)</h3>
                  <p className="mb-3">
                    Healthcare organizations adopting Clarafi enterprise-wide will receive appropriate Business Associate 
                    Agreements and compliance documentation. Organizations may claim and manage data created by their 
                    workforce members during individual use.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">6. PROHIBITED USES</h2>
                  <p className="mb-3">You agree NOT to:</p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Upload patient data without proper authority or patient relationship</li>
                    <li>Share your account credentials with others</li>
                    <li>Use the Service for any illegal or unauthorized purpose</li>
                    <li>Upload data from organizations that have explicitly prohibited such use</li>
                    <li>Attempt to circumvent any security measures</li>
                    <li>Use the Service in violation of HIPAA or other privacy laws</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">7. DISCLAIMERS AND LIMITATIONS OF LIABILITY</h2>
                  
                  <h3 className="font-semibold mb-2">7.1 Service Disclaimer</h3>
                  <p className="mb-3">
                    THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. CLARAFI DISCLAIMS ALL WARRANTIES, 
                    EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
                  </p>

                  <h3 className="font-semibold mb-2">7.2 Clinical Decisions</h3>
                  <p className="mb-3">
                    Clarafi is a documentation tool only. All clinical decisions remain your sole responsibility. 
                    Always verify AI-generated content and maintain professional medical judgment.
                  </p>

                  <h3 className="font-semibold mb-2">7.3 Limitation of Liability</h3>
                  <p className="mb-3">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLARAFI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                    SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">8. PRIVACY AND SECURITY</h2>
                  <p className="mb-3">
                    Your use of Clarafi is also governed by our Privacy Policy. We implement industry-standard security 
                    measures to protect patient data, including encryption at rest and in transit.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">9. TERMINATION</h2>
                  <p className="mb-3">
                    We may terminate or suspend your account immediately, without prior notice, for any breach of these 
                    Terms. Upon termination, your right to use the Service will cease immediately.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">10. GOVERNING LAW</h2>
                  <p className="mb-3">
                    These Terms shall be governed by and construed in accordance with the laws of the State of Texas, 
                    without regard to its conflict of law provisions.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">11. CHANGES TO TERMS</h2>
                  <p className="mb-3">
                    We reserve the right to modify these Terms at any time. Continued use of the Service after changes 
                    constitutes acceptance of the modified Terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">12. CONTACT INFORMATION</h2>
                  <p className="mb-3">
                    For questions about these Terms, please contact us at legal@clarafi.com
                  </p>
                </section>

                <section className="border-t pt-6 mt-8">
                  <p className="font-semibold text-center">
                    BY USING CLARAFI, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}