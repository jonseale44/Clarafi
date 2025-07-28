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

  // Track landing page visit for marketing analytics
  useEffect(() => {
    // Import analytics service
    import('@/lib/analytics').then(({ analytics }) => {
      // Track page view with landing page specific data
      analytics.trackPageView({
        page: '/',
        pageType: 'landing'
      });
      
      // Track landing as a conversion event
      analytics.trackEvent('landing_page_visit', {
        source: new URLSearchParams(window.location.search).get('utm_source') || 'direct',
        medium: new URLSearchParams(window.location.search).get('utm_medium') || 'none',
        campaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'none',
        referrer: document.referrer || 'direct'
      });
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo with custom color scheme */}
            <div className="font-black text-3xl tracking-tight">
              <span style={{ color: '#1e3a8a' }}>CLAR</span>
              <span className="text-yellow-500">A</span>
              <span style={{ color: '#1e3a8a' }}>F</span>
              <span className="text-yellow-500">I</span>
            </div>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#solution" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                Features
              </a>
              <a href="#pricing" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                Pricing
              </a>
              <Link href="/about" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                About
              </Link>
              <Link href="/blog" className="text-gray-100 hover:text-white transition-colors font-medium text-lg">
                Blog
              </Link>
            </div>
            
            {/* Auth CTAs */}
            <div className="flex items-center gap-4">
              <Link href="/auth">
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg">
                  Start Free Trial
                </Button>
              </Link>
              
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => {
                  // TODO: Implement mobile menu toggle
                  toast({
                    title: "Mobile Menu",
                    description: "Mobile menu coming soon",
                  });
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        id="hero" 
        className="relative pt-32 pb-20 px-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 50%, #16213e 100%)'
        }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-yellow-500/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-8">
            {/* Main headline with bold typography */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white animate-fadeInUp mb-8" style={{ lineHeight: '1.2' }}>
              Stop Charting.
              <span className="block bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent animate-gradient pb-2">
                Start Living.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed animate-fadeInUp delay-200">
              The only AI EMR that drafts everything—notes, orders, billing—while you focus on what matters. 
              <span className="block mt-2 text-yellow-400 font-semibold">
                Built by physicians, for physicians.
              </span>
            </p>
            
            {/* Primary and Secondary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 animate-fadeInUp delay-300">
              <Link href="/auth?tab=register">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  Start Free for 30 Days
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-6 border-2 border-white/30 bg-transparent text-white hover:bg-white/10 backdrop-blur-sm"
                onClick={() => {
                  // TODO: Open demo video modal
                  toast({
                    title: "Demo Video Coming Soon",
                    description: "We're putting the finishing touches on our demo video.",
                  });
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Watch 2-Min Demo
              </Button>
            </div>
            
            {/* Trust line */}
            <p className="text-base text-gray-400 mt-6 animate-fadeInUp delay-400">
              <span className="text-green-400 font-semibold">✓ No credit card required</span>
              <span className="mx-3">•</span>
              <span>No sales calls</span>
              <span className="mx-3">•</span>
              <span>No demos required</span>
              <span className="mx-3">•</span>
              <span>Just medicine</span>
            </p>
          </div>
          
          {/* Hero Visual - Split screen */}
          <div className="mt-4 relative animate-fadeInUp delay-500">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black/30 backdrop-blur-sm border border-white/10">
              <div className="grid md:grid-cols-2 min-h-[400px]">
                {/* Left side - Physician with patient */}
                <div className="relative p-8 flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20 animate-slideInLeft delay-600">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center animate-pulse-glow">
                      <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Focus on Your Patient</h3>
                    <p className="text-gray-300">Maintain eye contact. Build connection. Practice medicine.</p>
                  </div>
                </div>
                
                {/* Right side - AI documentation */}
                <div className="relative p-8 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 animate-slideInRight delay-600">
                  <div className="space-y-3">
                    <div className="bg-black/40 rounded-lg p-4 backdrop-blur-sm animate-fadeInUp delay-700">
                      <p className="text-sm font-mono text-green-400 mb-1">AI Transcribing...</p>
                      <p className="text-xs text-gray-400">Patient reports 3-day history of progressive chest pain...</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 backdrop-blur-sm animate-fadeInUp delay-800">
                      <p className="text-sm font-mono text-blue-400 mb-1">SOAP Note Generating...</p>
                      <p className="text-xs text-gray-400">S: 45yo male presents with substernal chest pain...</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 backdrop-blur-sm animate-fadeInUp delay-900">
                      <p className="text-sm font-mono text-yellow-400 mb-1">Orders Ready...</p>
                      <p className="text-xs text-gray-400">• CBC, CMP, Troponin • EKG • Chest X-ray</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 backdrop-blur-sm animate-fadeInUp delay-1000">
                      <p className="text-sm font-mono text-purple-400 mb-1">Billing Codes Selected...</p>
                      <p className="text-xs text-gray-400">99214 - Level 4 E/M • 93000 - EKG</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Center divider with pulse animation */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-50">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-float">
              Save 2+ Hours Daily
            </div>
            <div className="absolute bottom-4 left-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-float delay-300">
              99% Accuracy
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Problem Agitation */}
      <section id="problem" className="pt-12 pb-20 px-4 bg-gradient-to-b from-gray-900 to-black relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            How Much of Your Life Are You Losing to Documentation?
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 animate-fadeInUp delay-100">
            Every hour charting is an hour stolen from your life.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pain Point 1 - Time Lost */}
            <div className="relative group animate-fadeInUp delay-200">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 rounded-lg blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-red-500/20 p-8 rounded-lg hover:border-red-500/40 transition-all duration-300">
                <div className="text-red-500 mb-6">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">2-3 Hours Daily on Documentation</h3>
                <p className="text-gray-300 mb-4">
                  That's 15+ hours per week. 60+ hours per month. 720+ hours per year.
                </p>
                <p className="text-red-400 font-semibold">
                  What could you do with 720 hours of your life back?
                </p>
              </div>
            </div>
            
            {/* Pain Point 2 - Scattered Information */}
            <div className="relative group animate-fadeInUp delay-300">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-800 rounded-lg blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-orange-500/20 p-8 rounded-lg hover:border-orange-500/40 transition-all duration-300">
                <div className="text-orange-500 mb-6">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Critical Data Trapped Everywhere</h3>
                <p className="text-gray-300 mb-4">
                  Paper charts. Faxed consults. Scanned PDFs. Hand-written notes. Different EMRs.
                </p>
                <p className="text-orange-400 font-semibold">
                  Your patient's story is scattered across a dozen disconnected systems.
                </p>
              </div>
            </div>
            
            {/* Pain Point 3 - Lost Revenue */}
            <div className="relative group animate-fadeInUp delay-400">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 p-8 rounded-lg hover:border-purple-500/40 transition-all duration-300">
                <div className="text-purple-500 mb-6">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">$125,000+ Left Behind Annually</h3>
                <p className="text-gray-300 mb-4">
                  Undercoding. Missed procedures. Denials. Incomplete documentation.
                </p>
                <p className="text-purple-400 font-semibold">
                  Every rushed note is money walking out the door.
                </p>
              </div>
            </div>
          </div>
          
          {/* Central burnout message */}
          <div className="text-center mt-20 animate-fadeInUp delay-500">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 blur-3xl opacity-20" />
              <p className="relative text-3xl md:text-4xl text-white font-bold mb-4">
                75% of physicians report burnout.
              </p>
              <p className="relative text-xl text-gray-400">
                This isn't sustainable. And it's not why you became a physician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Solution Showcase */}
      <section id="solution" className="pt-12 pb-20 px-4 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            Watch AI Transform Your Practice in Real-Time
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 animate-fadeInUp delay-100">
            From chaos to clarity in seconds. Any format. Any source. Any time period.
          </p>
          
          {/* Hero Feature - Attachment Processing */}
          <div className="relative mb-20 animate-fadeInUp delay-200">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-3xl opacity-20" />
            <div className="relative bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left side - Upload visualization */}
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-white mb-4">
                    <span className="block mb-2">Your Patient's Entire History.</span>
                    <span className="block text-yellow-400">Instantly Organized.</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-gray-300">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p>Upload <span className="font-semibold text-white">any document</span> - handwritten notes, faxes, PDFs, photos</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-gray-300">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p>AI reads <span className="font-semibold text-white">everything</span> - diagnoses, meds, labs, procedures</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-gray-300">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p>Creates <span className="font-semibold text-white">complete chart</span> - structured, searchable, compliant</p>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold"
                  >
                    See It In Action →
                  </Button>
                </div>
                
                {/* Right side - Visual demonstration */}
                <div className="relative">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Input documents */}
                    <div className="space-y-3">
                      <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 transform -rotate-3 hover:rotate-0 transition-transform">
                        <p className="text-xs text-gray-400 mb-1">Handwritten Note</p>
                        <div className="h-20 bg-gray-800 rounded flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 transform rotate-2 hover:rotate-0 transition-transform">
                        <p className="text-xs text-gray-400 mb-1">Faxed Lab Results</p>
                        <div className="h-20 bg-gray-800 rounded flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <svg className="w-12 h-12 text-yellow-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Output - Structured Chart */}
                  <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-lg shadow-2xl animate-float">
                    <p className="text-sm font-bold text-white mb-2">Complete Chart</p>
                    <div className="space-y-1 text-xs text-white/90">
                      <p>✓ Medical Problems</p>
                      <p>✓ Medications</p>
                      <p>✓ Lab History</p>
                      <p>✓ Procedures</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Three-step workflow */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Step 1 - Voice Recording */}
            <div className="relative group animate-fadeInUp delay-300">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700 p-8 rounded-lg hover:border-gray-600 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">Start Recording</h3>
                <p className="text-gray-400 text-center">
                  Just talk naturally with your patient. AI captures every detail.
                </p>
              </div>
            </div>
            
            {/* Step 2 - AI Processing */}
            <div className="relative group animate-fadeInUp delay-400">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-lg blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700 p-8 rounded-lg hover:border-gray-600 transition-all duration-300">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">AI Drafts Everything</h3>
                <p className="text-gray-400 text-center">
                  SOAP notes, orders, prescriptions, billing codes—all in real-time.
                </p>
              </div>
            </div>
            
            {/* Step 3 - Complete Documentation */}
            <div className="relative group animate-fadeInUp delay-500">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-800 rounded-lg blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700 p-8 rounded-lg hover:border-gray-600 transition-all duration-300">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">Review & Sign</h3>
                <p className="text-gray-400 text-center">
                  Everything complete. Nothing missed. Go home on time.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-2xl md:text-3xl text-center font-bold text-white animate-fadeInUp delay-600">
            Finally. Technology that works
            <span className="text-yellow-400"> for you</span>, not
            <span className="text-red-400"> against you</span>.
          </p>
        </div>
      </section>

      {/* Section 4 - Unique Value Propositions */}
      <section id="value-props" className="pt-12 pb-20 px-4 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            Why Settle for Half a Solution?
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 animate-fadeInUp delay-100">
            You need more than a scribe. You need better than legacy bloat.
          </p>
          
          {/* Two-track comparative messaging */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* vs AI Scribes */}
            <div className="relative animate-fadeInUp delay-200">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-2xl opacity-10" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 md:p-10">
                <div className="mb-6">
                  <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Compared to AI Scribes</span>
                  <h3 className="text-3xl font-bold text-white mt-2">
                    More Than a Scribe—
                    <span className="text-purple-400 block">A Complete EMR</span>
                  </h3>
                </div>
                
                <p className="text-gray-300 mb-8">
                  AI scribes stop at transcription. We built the entire ecosystem.
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">E-Prescribing Built In</h4>
                      <p className="text-sm text-gray-400">Auto-prescribe at a click. Send to any pharmacy.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Lab Order Integration</h4>
                      <p className="text-sm text-gray-400">Order labs. Track results. Auto-notify patients.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Billing & Revenue Cycle</h4>
                      <p className="text-sm text-gray-400">CPT codes auto-selected. Maximize every visit.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Patient Portal & Scheduling</h4>
                      <p className="text-sm text-gray-400">Patients book appointments and access records 24/7.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-purple-300 font-medium">
                    💡 Scribes give you notes. We give you your practice back.
                  </p>
                </div>
              </div>
            </div>
            
            {/* vs Traditional EMRs */}
            <div className="relative animate-fadeInUp delay-300">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-2xl opacity-10" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8 md:p-10">
                <div className="mb-6">
                  <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Compared to Legacy EMRs</span>
                  <h3 className="text-3xl font-bold text-white mt-2">
                    AI-Native, Not 
                    <span className="text-blue-400 block">Bolted On</span>
                  </h3>
                </div>
                
                <p className="text-gray-300 mb-8">
                  Traditional EMRs fight you at every click. We built for flow.
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">3-Minute Setup</h4>
                      <p className="text-sm text-gray-400">Not 6 months. Not 6 weeks. Just 3 minutes to your first patient.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Autonomous Documentation</h4>
                      <p className="text-sm text-gray-400">AI doesn't just assist—it completes entire workflows for you.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Physician-Designed Workflows</h4>
                      <p className="text-sm text-gray-400">Built by doctors who actually use it. Not IT committees.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Updates That Excite, Not Terrify</h4>
                      <p className="text-sm text-gray-400">Weekly improvements, not yearly disasters requiring retraining.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-300 font-medium">
                    🚀 Legacy EMRs trap you in 1995. We're building for 2030.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Central value prop */}
          <div className="text-center mt-16 animate-fadeInUp delay-400">
            <p className="text-2xl md:text-3xl font-bold text-white">
              Finally. The
              <span className="text-yellow-400"> complete solution</span> you've been waiting for.
            </p>
            <Link href="/auth?tab=register">
              <Button 
                size="lg" 
                className="mt-8 text-lg px-10 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                See the Difference →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5 - Feature Deep Dive */}
      <section id="features" className="pt-12 pb-20 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            <span className="block mb-2">Everything You Need...</span>
            <span className="text-yellow-400 block">Plus Some Things You'll Love</span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 animate-fadeInUp delay-100">
            Essential features that work + AI magic that delights
          </p>
          
          {/* Feature cards with expanding details */}
          <div className="space-y-6">
            {/* AI Documentation Feature */}
            <div className="group relative animate-fadeInUp delay-200">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">AI Documentation That Actually Works</h3>
                    <p className="text-gray-300 mb-4">
                      Just talk naturally. AI captures everything and creates perfect documentation.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-300 mb-2">🎯 What You Need:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Accurate SOAP notes every time</li>
                          <li>• CPT codes auto-selected</li>
                          <li>• Orders extracted automatically</li>
                        </ul>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-300 mb-2">✨ What You'll Love:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• AI learns your documentation style</li>
                          <li>• Suggests diagnoses you might miss</li>
                          <li>• Auto-drafts patient instructions</li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-sm text-green-400 font-medium">
                      → Outcome: Documentation done before patient leaves. Every. Single. Time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Attachment Parser Feature */}
            <div className="group relative animate-fadeInUp delay-300">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Universal Attachment Parser</h3>
                    <p className="text-gray-300 mb-4">
                      Upload anything. Handwritten notes, faxes, even photos. AI makes it structured data.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-300 mb-2">🎯 What You Need:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Extract data from any document</li>
                          <li>• Build complete medical histories</li>
                          <li>• Import external lab results</li>
                        </ul>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-300 mb-2">✨ What You'll Love:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Reads doctor's handwriting</li>
                          <li>• Highlights critical findings</li>
                          <li>• Links everything to source docs</li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-sm text-green-400 font-medium">
                      → Outcome: Complete patient histories in minutes, not hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Revolutionary Lab Processing Feature */}
            <div className="group relative animate-fadeInUp delay-350">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Lab Processing That Works With ANY Lab Worldwide</h3>
                    <p className="text-gray-300 mb-4">
                      No integrations needed. No waiting. Start processing labs from any source in 5 minutes.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-300 mb-2">🎯 What You Need:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Order labs from any provider</li>
                          <li>• Process results instantly</li>
                          <li>• Review & send to patients</li>
                        </ul>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-300 mb-2">✨ What You'll Love:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Works with PDFs, faxes, photos</li>
                          <li>• Links results to original orders</li>
                          <li>• Generates patient explanations</li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-sm text-green-400 font-medium">
                      → Outcome: Complete lab workflow without expensive integrations. Deploy today.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Clinical Intelligence Feature */}
            <div className="group relative animate-fadeInUp delay-400">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-blue-500/30 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Clinical Intelligence That Thinks Ahead</h3>
                    <p className="text-gray-300 mb-4">
                      AI that knows medicine, learns your patterns, and catches what humans miss.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-300 mb-2">🎯 What You Need:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Drug interaction checking</li>
                          <li>• Lab result interpretation</li>
                          <li>• Evidence-based suggestions</li>
                        </ul>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-300 mb-2">✨ What You'll Love:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Remembers patient preferences</li>
                          <li>• Predicts appointment durations</li>
                          <li>• Suggests follow-up timing</li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-sm text-green-400 font-medium">
                      → Outcome: Practice medicine with a brilliant assistant watching your back.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Practice Management Feature */}
            <div className="group relative animate-fadeInUp delay-500">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-green-500/30 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Complete Practice Management</h3>
                    <p className="text-gray-300 mb-4">
                      Everything to run your practice. No separate systems. No double entry.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-300 mb-2">🎯 What You Need:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Auto-prescribing from visit notes</li>
                          <li>• Auto lab/imaging ordering</li>
                          <li>• Automated billing/coding</li>
                        </ul>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-300 mb-2">✨ What You'll Love:</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Patients self-schedule online</li>
                          <li>• AI predicts visit duration based on complexity</li>
                          <li>• Revenue insights dashboard</li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-sm text-green-400 font-medium">
                      → Outcome: Focus on patients while the business runs itself.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fun AI helpers callout */}
          <div className="mt-16 text-center animate-fadeInUp delay-600">
            <div className="inline-block bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-full px-8 py-4">
              <p className="text-lg text-yellow-300 font-medium">
                🤖 Plus dozens of tiny AI helpers that make you smile every day
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 - Trust Without Social Proof */}
      <section id="about" className="pt-12 pb-20 px-4 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            <span className="block mb-2">Built by Physicians.</span>
            <span className="text-yellow-400 block">For Physicians.</span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 animate-fadeInUp delay-100">
            We understand because we've been there
          </p>
          
          {/* Founder Story */}
          <div className="mb-16 animate-fadeInUp delay-200">
            <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-white mb-3">Physician-Founded</h3>
                  <p className="text-gray-300 mb-4">
                    Built by physicians who understand the daily struggle with documentation. We've experienced the nights, weekends, and family time lost to EMRs. Clarafi was designed from the ground up to give you your life back.
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Created by practicing physicians who use it every day
                  </p>
                  <Link href="/about">
                    <Button 
                      variant="outline" 
                      className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500"
                    >
                      Read Our Full Story
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* Security Compliant */}
            <div className="relative group animate-fadeInUp delay-300">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-blue-500/30 transition-all">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Enterprise Security</h3>
                <p className="text-sm text-gray-400 mb-3">
                  HIPAA compliant, SOC2 Type II certified, 256-bit encryption
                </p>
                <div className="flex justify-center gap-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">HIPAA</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">SOC2</span>
                </div>
              </div>
            </div>
            
            {/* Money Back Guarantee */}
            <div className="relative group animate-fadeInUp delay-400">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-green-500/30 transition-all">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">30-Day Guarantee</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Not happy? Get a full refund. No questions, no hassle, no risk.
                </p>
                <div className="flex justify-center gap-2">
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">100%</span>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Risk-Free</span>
                </div>
              </div>
            </div>
            
            {/* No Lock-in */}
            <div className="relative group animate-fadeInUp delay-500">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-purple-500/30 transition-all">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">No Lock-In</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Export your data anytime. Cancel anytime. Your practice, your control.
                </p>
                <div className="flex justify-center gap-2">
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Flexible</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Open</span>
                </div>
              </div>
            </div>
            
            {/* Always Improving */}
            <div className="relative group animate-fadeInUp delay-600">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-yellow-500/30 transition-all">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Regular Updates</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Continuous improvements. AI gets smarter. Your feedback drives development.
                </p>
                <div className="flex justify-center gap-2">
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">AI 4.0</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Weekly</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Clinical Credibility Section */}
          <div className="text-center animate-fadeInUp delay-700">
            <h3 className="text-3xl font-bold text-white mb-8">
              Clinical Excellence at the Core
            </h3>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                <div className="text-4xl mb-3">🧬</div>
                <h4 className="font-bold text-white mb-2">Latest AI Models</h4>
                <p className="text-sm text-gray-400">
                  GPT-4.1 with finely tuned prompts. Updates with each new GPT version.
                </p>
              </div>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                <div className="text-4xl mb-3">📚</div>
                <h4 className="font-bold text-white mb-2">Evidence-Based</h4>
                <p className="text-sm text-gray-400">
                  Every suggestion backed by current clinical guidelines and research.
                </p>
              </div>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                <div className="text-4xl mb-3">🔍</div>
                <h4 className="font-bold text-white mb-2">Complete Context</h4>
                <p className="text-sm text-gray-400">
                  AI considers full patient history, not just today's visit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 - Pricing */}
      <section id="pricing" className="py-20 px-4 bg-gray-900">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            Simple Pricing. Powerful Results.
          </h2>
          <p className="text-xl text-center text-gray-400 mb-16 animate-fadeInUp delay-100">
            Start free. Scale when you're ready.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Individual Provider */}
            <div className="relative animate-fadeInUp delay-200">
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold px-4 py-1 rounded-full text-sm z-10">
                NO CREDIT CARD
              </div>
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-yellow-500/30 transition-all h-full flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-2">Individual Provider</h3>
                <div className="mb-6">
                  <span className="text-gray-400 block text-sm mb-1">Perfect for solo practitioners</span>
                  <div>
                    <span className="text-5xl font-bold text-white">$149</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Everything included - no tiers</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Unlimited patients & encounters</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">All AI features & updates</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">E-prescribing & lab ordering</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Cancel anytime, no questions</span>
                  </li>
                </ul>
                
                <Link href="/auth?tab=register">
                  <Button 
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all" 
                    size="lg"
                  >
                    Start 30-Day Free Trial
                  </Button>
                </Link>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  No credit card required • 5-minute clinic setup • Works with ANY lab worldwide
                </p>
              </div>
            </div>
            
            {/* Enterprise */}
            <div className="relative animate-fadeInUp delay-300">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-2xl opacity-10" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-white">Enterprise</h3>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">POPULAR</span>
                </div>
                <div className="mb-6">
                  <span className="text-gray-400 block text-sm mb-1">Starting at</span>
                  <div>
                    <span className="text-5xl font-bold text-white">$399</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Everything in Individual</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Multi-location support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Advanced analytics & reporting</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Priority support & training</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">Custom integrations available</span>
                  </li>
                </ul>
                
                <Link href="/admin-verification">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all" 
                    size="lg"
                  >
                    Apply for Enterprise
                  </Button>
                </Link>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  Per-user pricing • Priority support • Custom integrations
                </p>
              </div>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="mt-16 text-center animate-fadeInUp delay-400">
            <div className="inline-flex items-center gap-8 text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span className="text-sm">30-Day Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 - Final CTA */}
      <section id="final-cta" className="py-24 px-4 relative overflow-hidden">
        {/* Gradient background with dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900" />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Animated elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white animate-fadeInUp">
            Your Patients Are Waiting for the
            <span className="block text-yellow-400 mt-2">Best Version of You</span>
          </h2>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-gray-100 animate-fadeInUp delay-100">
            Join <span className="text-yellow-400 font-semibold">2,847 physicians</span> who refuse to let documentation 
            define their practice. Start your transformation today.
          </p>
          
          {/* Urgency indicator */}
          <div className="inline-block bg-red-500/30 border border-red-500/50 rounded-full px-6 py-2 mb-8 animate-fadeInUp delay-200">
            <p className="text-sm text-red-200 font-medium">
              🔥 Limited time: No credit card required for first 1,000 providers
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fadeInUp delay-300">
            <Link href="/auth?tab=register">
              <Button 
                size="lg" 
                className="text-lg px-10 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all"
              >
                Start Your Free 30-Day Trial
                <svg className="ml-2 w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
            <Link href="/auth">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-6 border-white/20 bg-black/20 text-white hover:bg-white/10 hover:border-white/30"
              >
                Already Started? Sign In
              </Button>
            </Link>
          </div>
          
          <div className="space-y-2 text-sm animate-fadeInUp delay-400">
            <p className="text-gray-200">✓ Setup takes 3 minutes • ✓ No IT required • ✓ Cancel anytime</p>
            <p className="font-semibold text-white">No credit card. No commitment. Just results.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Company info */}
            <div className="md:col-span-2">
              <div className="font-black text-2xl tracking-tight mb-4">
                <span style={{ color: '#1e3a8a' }}>CLAR</span>
                <span className="text-yellow-500">A</span>
                <span style={{ color: '#1e3a8a' }}>F</span>
                <span className="text-yellow-500">I</span>
              </div>
              <p className="text-gray-400 mb-6">
                The AI-native EMR that empowers physicians to deliver their best care while reclaiming their lives.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://twitter.com/clarafi" 
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>
                <a 
                  href="https://linkedin.com/company/clarafi" 
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Product links */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#solution" className="text-gray-400 hover:text-white transition-colors">How It Works</a></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><a href="/changelog" className="text-gray-400 hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/docs" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/api" className="text-gray-400 hover:text-white transition-colors">API Reference</a></li>
                <li><a href="/integrations" className="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
                <li><a href="/status" className="text-gray-400 hover:text-white transition-colors">System Status</a></li>
                <li><a href="/webinars" className="text-gray-400 hover:text-white transition-colors">Webinars</a></li>
              </ul>
            </div>
            
            {/* Legal & Support */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/legal/baa" className="text-gray-400 hover:text-white transition-colors">HIPAA BAA</Link></li>
                <li><a href="mailto:support@clarafi.com" className="text-gray-400 hover:text-white transition-colors">support@clarafi.com</a></li>
                <li><a href="tel:1-800-CLARAFI" className="text-gray-400 hover:text-white transition-colors">1-800-CLARAFI</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                &copy; 2025 Clarafi Medical, Inc. All rights reserved.
              </p>
              <p className="text-sm text-gray-500">
                Built with passion by physicians, for physicians.
              </p>
            </div>
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