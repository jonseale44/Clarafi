import { 
  Check, 
  X, 
  FileText, 
  Mic, 
  Brain, 
  ClipboardList, 
  Pill,
  FlaskConical,
  Building2,
  Users,
  Shield,
  HeartHandshake,
  ChevronRight,
  Sparkles,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/auth">
            <h1 className="text-3xl font-bold cursor-pointer">
              <span className="text-navy-blue">CLAR</span><span className="text-gold">AFI</span>
            </h1>
          </Link>
          <Link href="/auth">
            <Button variant="ghost">Back to Login</Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy-blue-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your practice. No hidden fees, no separate subscriptions for AI and EMR.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {/* AI Scribe Plan */}
          <Card className="relative overflow-hidden border-2 hover:border-gold transition-colors">
            <div className="absolute top-4 right-4">
              <Badge className="bg-gold text-navy-blue-900">Individual Provider</Badge>
            </div>
            <CardHeader className="pb-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Brain className="h-6 w-6 text-gold" />
                AI Scribe
              </CardTitle>
              <CardDescription className="text-lg">
                Perfect for solo practitioners who want advanced documentation
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-navy-blue-900">$149</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                <p className="font-semibold">14-Day Free Trial</p>
                <p className="text-sm">No credit card required to start</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-navy-blue-900">What's Included:</h4>
                
                {/* Core Features */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Voice Transcription</p>
                      <p className="text-sm text-gray-600">Real-time medical speech-to-text</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">AI Clinical Suggestions</p>
                      <p className="text-sm text-gray-600">Evidence-based recommendations in real-time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">SOAP Note Generation</p>
                      <p className="text-sm text-gray-600">Automatic clinical documentation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Full Chart Updates</p>
                      <p className="text-sm text-gray-600">Complete patient record management</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Unlimited Patients</p>
                      <p className="text-sm text-gray-600">No limits on patient records</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Limitations */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">Not Included:</h5>
                  
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">E-Prescribing</p>
                      <p className="text-sm text-gray-600">Orders generated but not transmitted</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Lab Integration</p>
                      <p className="text-sm text-gray-600">Lab orders created but not sent</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Billing Integration</p>
                      <p className="text-sm text-gray-600">CPT codes generated but not billable</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Multi-Provider Access</p>
                      <p className="text-sm text-gray-600">Single provider only</p>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/auth?register=true">
                <Button className="w-full bg-gold hover:bg-gold-600 text-navy-blue-900">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Enterprise EMR Plan */}
          <Card className="relative overflow-hidden border-2 border-navy-blue hover:border-navy-blue-700 transition-colors">
            <div className="absolute top-4 right-4">
              <Badge className="bg-navy-blue text-white">Multi-Provider</Badge>
            </div>
            <CardHeader className="pb-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="h-6 w-6 text-navy-blue" />
                Enterprise EMR
              </CardTitle>
              <CardDescription className="text-lg">
                Complete EMR with all integrations for practices
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-navy-blue-900">Custom</span>
                <span className="text-gray-600"> pricing</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Per-User Pricing */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h5 className="font-semibold text-navy-blue-900 mb-2">Per-User Pricing:</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Providers (MD, DO, NP, PA)</span>
                    <span className="font-semibold">$399/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clinical Staff (RN, MA, LPN)</span>
                    <span className="font-semibold">$99/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Staff</span>
                    <span className="font-semibold">$49/mo</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-navy-blue-900">Everything in AI Scribe, plus:</h4>
                
                {/* Enterprise Features */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">E-Prescribing to Pharmacies</p>
                      <p className="text-sm text-gray-600">Direct transmission to any pharmacy</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Lab Integration</p>
                      <p className="text-sm text-gray-600">Quest & LabCorp direct ordering</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Multi-Location Support</p>
                      <p className="text-sm text-gray-600">Manage multiple practice locations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Team Collaboration</p>
                      <p className="text-sm text-gray-600">Real-time updates across providers</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Admin Dashboard</p>
                      <p className="text-sm text-gray-600">Practice analytics & management</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Subscription Key Distribution</p>
                      <p className="text-sm text-gray-600">Easy team onboarding</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Priority Support</p>
                      <p className="text-sm text-gray-600">Dedicated support team</p>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/admin-verification">
                <Button className="w-full bg-navy-blue hover:bg-navy-blue-700 text-white">
                  Apply for Enterprise
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-navy-blue-900">
            Detailed Feature Comparison
          </h2>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">AI Scribe</th>
                      <th className="text-center p-4 font-semibold">Enterprise EMR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Core Features */}
                    <tr className="border-b">
                      <td colSpan={3} className="p-4 bg-gray-50 font-semibold">
                        Core Documentation
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Voice Transcription</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">AI Clinical Suggestions</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">SOAP Note Generation</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Complete Patient Charts</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    
                    {/* Integration Features */}
                    <tr className="border-b">
                      <td colSpan={3} className="p-4 bg-gray-50 font-semibold">
                        External Integrations
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">E-Prescribing to Pharmacies</td>
                      <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Lab Order Transmission</td>
                      <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Insurance Eligibility Check</td>
                      <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    
                    {/* Team Features */}
                    <tr className="border-b">
                      <td colSpan={3} className="p-4 bg-gray-50 font-semibold">
                        Team & Practice Management
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Multiple Provider Access</td>
                      <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Role-Based Access Control</td>
                      <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Admin Dashboard</td>
                      <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                      <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8 text-navy-blue-900">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I upgrade from AI Scribe to Enterprise later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can upgrade at any time. All your data will seamlessly transfer to the Enterprise plan, 
                  and you'll gain immediate access to all advanced features.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens with orders in the AI Scribe plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  The AI Scribe plan generates all orders and CPT codes just like the Enterprise plan. 
                  However, they remain within the system and aren't transmitted to external pharmacies or labs. 
                  You can print or manually process these orders.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does the 14-day trial work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Both plans include a 14-day free trial with full access to all features. 
                  No credit card is required to start. You can cancel anytime during the trial period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 bg-navy-blue rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Practice?</h2>
          <p className="text-lg mb-6">Join thousands of providers saving hours on documentation every day.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth?register=true">
              <Button size="lg" className="bg-gold hover:bg-gold-600 text-navy-blue-900">
                Start Free Trial
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-navy-blue">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}