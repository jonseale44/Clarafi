import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  // TODO: Track page view for marketing analytics
  useEffect(() => {
    // Track landing page visit with source, medium, campaign
    console.log('TODO: Track landing page visit');
  }, []);

  return (
    <div className="min-h-screen">
      {/* TODO: Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* TODO: Logo/Brand */}
            <div>
              <h1 className="text-2xl font-bold">Clarafi</h1>
            </div>
            
            {/* TODO: Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link href="/blog">Blog</Link>
            </div>
            
            {/* TODO: Auth CTAs */}
            <div className="flex items-center gap-4">
              <Link href="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button>Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* TODO: Section 1 - Hero Section */}
      <section id="hero" className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* TODO: Implement bold gradient background */}
          {/* TODO: Add animated particles or medical visualization */}
          
          <div className="text-center space-y-6">
            {/* TODO: Main headline with bold typography */}
            <h1 className="text-5xl md:text-7xl font-bold">
              Stop Charting. Start Living.
            </h1>
            
            {/* TODO: Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              The only AI EMR that drafts everything—notes, orders, billing—while you focus on what matters.
            </p>
            
            {/* TODO: Primary and Secondary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" className="text-lg px-8">
                Start Your 30-Day Trial
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Watch 2-Min Demo
              </Button>
            </div>
            
            {/* TODO: Trust line */}
            <p className="text-sm text-muted-foreground">
              No sales calls. No demos required. Just medicine.
            </p>
          </div>
          
          {/* TODO: Hero Visual - Split screen animation */}
          <div className="mt-12">
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
              <p className="text-muted-foreground">
                TODO: Split-screen animation - Physician with patient / AI documentation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TODO: Section 2 - Problem Agitation (Motivational) */}
      <section id="problem" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            You Became a Doctor to Heal, Not Type
          </h2>
          
          {/* TODO: Three animated pain points with icons */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold mb-2">2+ hours lost to documentation daily</h3>
                <p className="text-muted-foreground">TODO: Animated counter showing yearly hours</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🔗</div>
                <h3 className="text-xl font-semibold mb-2">Critical context scattered across systems</h3>
                <p className="text-muted-foreground">TODO: Visual of disconnected data points</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">⚖️</div>
                <h3 className="text-xl font-semibold mb-2">Choose: Complete notes or patient connection?</h3>
                <p className="text-muted-foreground">TODO: Animated scale tipping</p>
              </div>
            </Card>
          </div>
          
          {/* TODO: Transition text */}
          <p className="text-2xl text-center mt-12 font-medium">
            What if technology finally worked FOR you?
          </p>
        </div>
      </section>

      {/* TODO: Section 3 - Solution Showcase */}
      <section id="solution" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            Watch AI Transform Your Practice
          </h2>
          
          {/* TODO: Interactive Demo Section */}
          <div className="bg-muted rounded-lg p-8">
            <div className="aspect-video bg-background rounded flex items-center justify-center">
              <p className="text-muted-foreground">
                TODO: Embedded video player with chapter markers
              </p>
            </div>
            
            {/* TODO: Workflow visualization */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                <p className="font-semibold">Start Recording</p>
                <p className="text-sm text-muted-foreground">TODO: Wave visualization</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">AI Drafts in Real-Time</p>
                <p className="text-sm text-muted-foreground">TODO: Text appearing animation</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Orders & Billing Ready</p>
                <p className="text-sm text-muted-foreground">TODO: Instant population visual</p>
              </div>
            </div>
          </div>
          
          <p className="text-2xl text-center mt-8 font-medium">
            Everything drafted. Nothing missed. Go home on time.
          </p>
        </div>
      </section>

      {/* TODO: Section 4 - Unique Value Propositions */}
      <section id="value-props" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            The Best of Both Worlds
          </h2>
          
          {/* TODO: Two-track messaging */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* vs AI Scribes */}
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-4">More Than a Scribe—A Complete EMR</h3>
              <p className="text-muted-foreground mb-4">Unlike AI scribes that only take notes...</p>
              <ul className="space-y-2">
                <li>TODO: E-prescribing capability</li>
                <li>TODO: Lab ordering integration</li>
                <li>TODO: Billing & revenue cycle</li>
                <li>TODO: Intelligent scheduling</li>
              </ul>
            </Card>
            
            {/* vs Traditional EMRs */}
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-4">AI-Native, Not Bolted On</h3>
              <p className="text-muted-foreground mb-4">Unlike legacy EMRs with add-on AI...</p>
              <ul className="space-y-2">
                <li>TODO: Autonomous documentation</li>
                <li>TODO: Instant setup (3 minutes)</li>
                <li>TODO: Physician-designed workflows</li>
                <li>TODO: Continuous AI improvements</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* TODO: Section 5 - Feature Deep Dive */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything You Need, Nothing You Don't
          </h2>
          
          {/* TODO: Tabbed interface or accordion */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">🎙️ AI Documentation</h3>
              <p className="text-muted-foreground">
                TODO: Voice capture, SOAP generation, templates - Feature → Benefit → Outcome
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">🧠 Clinical Intelligence</h3>
              <p className="text-muted-foreground">
                TODO: Full patient context, clinical suggestions - Feature → Benefit → Outcome
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">💰 Practice Management</h3>
              <p className="text-muted-foreground">
                TODO: E-prescribing, lab ordering, scheduling - Feature → Benefit → Outcome
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">🔄 Team Collaboration</h3>
              <p className="text-muted-foreground">
                TODO: Multi-provider support, role-based workflows - Feature → Benefit → Outcome
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">⚡ Enterprise Ready</h3>
              <p className="text-muted-foreground">
                TODO: HIPAA, integrations, analytics - Feature → Benefit → Outcome
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* TODO: Section 6 - Trust Without Social Proof */}
      <section id="trust" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            Built Different. Built Right.
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* TODO: Physician-Designed */}
            <Card className="p-6 text-center">
              <h3 className="font-semibold mb-2">Physician-Designed</h3>
              <p className="text-sm text-muted-foreground">TODO: Founder photo/bio</p>
            </Card>
            
            {/* TODO: Security */}
            <Card className="p-6 text-center">
              <h3 className="font-semibold mb-2">HIPAA & SOC2 Compliant</h3>
              <p className="text-sm text-muted-foreground">TODO: Security badges</p>
            </Card>
            
            {/* TODO: Guarantee */}
            <Card className="p-6 text-center">
              <h3 className="font-semibold mb-2">30-Day Money-Back Guarantee</h3>
              <p className="text-sm text-muted-foreground">TODO: Risk reversal messaging</p>
            </Card>
            
            {/* TODO: No Lock-in */}
            <Card className="p-6 text-center">
              <h3 className="font-semibold mb-2">Cancel Anytime</h3>
              <p className="text-sm text-muted-foreground">TODO: No lock-in messaging</p>
            </Card>
          </div>
          
          {/* TODO: Clinical Credibility Section */}
          <div className="mt-12 text-center">
            <h3 className="text-2xl font-semibold mb-4">Clinical Excellence Built In</h3>
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div>
                <p className="font-medium">Powered by GPT-4.1 Medical Models</p>
              </div>
              <div>
                <p className="font-medium">Trained on Current Clinical Guidelines</p>
              </div>
              <div>
                <p className="font-medium">Integrates Full Patient History</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TODO: Section 7 - Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-4">
            Simple Pricing. Powerful Results.
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Choose the plan that fits your practice
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Individual Practice */}
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-2">Individual Practice</h3>
              <p className="text-3xl font-bold mb-4">$149<span className="text-lg font-normal">/month</span></p>
              <ul className="space-y-2 mb-6">
                <li>✓ Everything included</li>
                <li>✓ Unlimited patients</li>
                <li>✓ All AI features</li>
                <li>✓ Cancel anytime</li>
              </ul>
              <Button className="w-full" size="lg">Start 30-Day Trial</Button>
            </Card>
            
            {/* Enterprise */}
            <Card className="p-8 border-primary">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <p className="text-3xl font-bold mb-4">Custom Pricing</p>
              <ul className="space-y-2 mb-6">
                <li>✓ Multi-location support</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Priority support</li>
                <li>✓ Custom integrations</li>
              </ul>
              <Button className="w-full" size="lg" variant="outline">Schedule 15-Min Call</Button>
            </Card>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-8">
            *Credit card required to prevent abuse. Cancel anytime within 30 days for full refund.
          </p>
        </div>
      </section>

      {/* TODO: Section 8 - Final CTA */}
      <section id="final-cta" className="py-20 px-4 bg-gradient-to-br from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Your Patients Are Waiting for the Best Version of You
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join forward-thinking physicians who refuse to let documentation 
            define their practice. Start your transformation today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth?tab=register">
              <Button size="lg" className="text-lg px-8">
                Begin Your 30-Day Journey
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Already Started? Sign In
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            Setup takes 3 minutes. No IT required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* TODO: Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            {/* TODO: Company info */}
            <div>
              <h3 className="font-semibold mb-4">Clarafi</h3>
              <p className="text-sm text-muted-foreground">
                The AI EMR that makes you better
              </p>
            </div>
            
            {/* TODO: Product links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link href="/blog">Blog</Link></li>
              </ul>
            </div>
            
            {/* TODO: Legal links */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/legal/baa">BAA</Link></li>
              </ul>
            </div>
            
            {/* TODO: Contact/Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>TODO: Support email</li>
                <li>TODO: Documentation link</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Clarafi. All rights reserved. Built with ❤️ for physicians.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// TODO: Marketing Event Tracking Utils
// - Track scroll depth
// - Track time on page
// - Track CTA clicks
// - Track video engagement
// - Track form abandonment
// - A/B testing framework