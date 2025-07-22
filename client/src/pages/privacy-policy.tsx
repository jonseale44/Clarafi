import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get('returnTo') || '/auth';
  const isFromRegistration = returnTo === '/auth?tab=register';
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <Link href={returnTo}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {isFromRegistration ? 'Back to Registration' : 'Back to Login'}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: January 22, 2025</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6 text-sm">
                <section>
                  <h2 className="text-lg font-semibold mb-3">1. INTRODUCTION</h2>
                  <p className="mb-3">
                    Clarafi ("we," "our," or "us") is committed to protecting the privacy and security of healthcare 
                    information. This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                    information when you use our medical documentation platform.
                  </p>
                  <p className="mb-3 font-semibold">
                    This service is designed for healthcare providers. By using Clarafi, you acknowledge that you are 
                    responsible for obtaining any necessary patient consents for documentation and data processing.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">2. INFORMATION WE COLLECT</h2>
                  
                  <h3 className="font-semibold mb-2">2.1 Account Information</h3>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Name, email address, and professional credentials</li>
                    <li>NPI number and license information</li>
                    <li>Practice location and affiliation</li>
                    <li>Account authentication data</li>
                  </ul>

                  <h3 className="font-semibold mb-2">2.2 Patient Health Information</h3>
                  <p className="mb-3">
                    When you use Clarafi to document patient encounters, we process:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Patient demographics and contact information</li>
                    <li>Medical history and clinical notes</li>
                    <li>Transcribed audio from patient encounters</li>
                    <li>Uploaded medical documents and images</li>
                    <li>Lab results and diagnostic information</li>
                    <li>Treatment plans and prescriptions</li>
                  </ul>

                  <h3 className="font-semibold mb-2">2.3 Usage Information</h3>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Log data and access times</li>
                    <li>Features used within the application</li>
                    <li>Device and browser information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">3. HOW WE USE INFORMATION</h2>
                  
                  <h3 className="font-semibold mb-2">3.1 Primary Uses</h3>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Provide medical documentation services</li>
                    <li>Process and transcribe clinical encounters</li>
                    <li>Generate AI-assisted clinical notes</li>
                    <li>Enable secure access to patient records</li>
                    <li>Facilitate healthcare operations</li>
                  </ul>

                  <h3 className="font-semibold mb-2">3.2 Service Improvement</h3>
                  <p className="mb-3">
                    We may use de-identified, aggregated data to:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Improve our AI models and services</li>
                    <li>Analyze usage patterns and feature adoption</li>
                    <li>Ensure system reliability and performance</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">4. HIPAA COMPLIANCE</h2>
                  <p className="mb-3">
                    Clarafi is designed to support HIPAA compliance:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>We implement administrative, physical, and technical safeguards</li>
                    <li>All data is encrypted in transit and at rest</li>
                    <li>Access is restricted based on user roles and permissions</li>
                    <li>We maintain audit logs of all data access</li>
                    <li>Business Associate Agreements are available for enterprise customers</li>
                  </ul>
                  <p className="mb-3 font-semibold">
                    Individual providers (Tier 1) are responsible for ensuring they have authority to use Clarafi 
                    with patient data and comply with their organization's policies.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">5. DATA SHARING AND DISCLOSURE</h2>
                  
                  <h3 className="font-semibold mb-2">5.1 We Do NOT:</h3>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Sell patient health information</li>
                    <li>Share data for marketing purposes</li>
                    <li>Use patient data for advertising</li>
                  </ul>

                  <h3 className="font-semibold mb-2">5.2 Limited Disclosures:</h3>
                  <p className="mb-3">We may disclose information only:</p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>With your explicit authorization</li>
                    <li>To authorized users within your healthcare organization</li>
                    <li>When required by law or court order</li>
                    <li>To protect patient safety in emergency situations</li>
                    <li>To our service providers under strict confidentiality agreements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">6. DATA RETENTION</h2>
                  <p className="mb-3">
                    We retain healthcare data in accordance with applicable laws and regulations:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Active patient records are retained while your account is active</li>
                    <li>Upon account termination, data may be retained as required by law</li>
                    <li>You may request data export or deletion (subject to legal requirements)</li>
                    <li>De-identified aggregate data may be retained indefinitely</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">7. DATA SECURITY</h2>
                  <p className="mb-3">We implement industry-standard security measures:</p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>256-bit AES encryption for data at rest</li>
                    <li>TLS 1.3 encryption for data in transit</li>
                    <li>Multi-factor authentication options</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>Secure data centers with physical access controls</li>
                    <li>Employee training on data security and HIPAA</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">8. YOUR RIGHTS</h2>
                  <p className="mb-3">You have the right to:</p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Access your account information</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Export your data in standard formats</li>
                    <li>Request account deletion (subject to legal requirements)</li>
                    <li>Opt-out of non-essential communications</li>
                  </ul>
                  <p className="mb-3">
                    Patients' rights to their health information are governed by HIPAA and should be directed 
                    to their healthcare provider.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">9. AI AND MACHINE LEARNING</h2>
                  <p className="mb-3">
                    Our AI-powered features process data as follows:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Audio transcription occurs in real-time and recordings are immediately deleted</li>
                    <li>AI models generate suggestions based on your input</li>
                    <li>We do not train our models on identifiable patient data without explicit consent</li>
                    <li>All AI processing occurs within our secure infrastructure</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">10. THIRD-PARTY SERVICES</h2>
                  <p className="mb-3">
                    We use limited third-party services:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Cloud infrastructure providers (under BAAs)</li>
                    <li>Payment processors (Stripe) for billing only</li>
                    <li>Analytics services that do not access patient data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">11. CHILDREN'S PRIVACY</h2>
                  <p className="mb-3">
                    Clarafi is intended for use by healthcare professionals only. We do not knowingly collect 
                    information directly from children under 13.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">12. CHANGES TO THIS POLICY</h2>
                  <p className="mb-3">
                    We may update this Privacy Policy periodically. We will notify you of material changes via 
                    email or through the application. Continued use after changes constitutes acceptance.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">13. CONTACT INFORMATION</h2>
                  <p className="mb-3">
                    For privacy-related questions or concerns:
                  </p>
                  <ul className="list-disc pl-6 mb-3 space-y-2">
                    <li>Email: privacy@clarafi.com</li>
                    <li>Mail: Clarafi Privacy Officer, [Address]</li>
                  </ul>
                  <p className="mb-3">
                    For security incidents or breaches, please contact: security@clarafi.com
                  </p>
                </section>

                <section className="border-t pt-6 mt-8">
                  <p className="font-semibold text-center">
                    BY USING CLARAFI, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY.
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