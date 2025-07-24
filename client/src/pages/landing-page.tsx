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
              <a href="#solution" className="text-gray-300 hover:text-white transition-colors font-medium">
                Features
              </a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors font-medium">
                Pricing
              </a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors font-medium">
                About
              </a>
              <Link href="/blog" className="text-gray-300 hover:text-white transition-colors font-medium">
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
        className="relative min-h-screen pt-24 pb-20 px-4 overflow-hidden"
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
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight animate-fadeInUp">
              Stop Charting.
              <span className="block bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent animate-gradient">
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
                className="text-lg px-10 py-6 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
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
          <div className="mt-16 relative animate-fadeInUp delay-500">
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
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-float">
              Save 2+ Hours Daily
            </div>
            <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-float delay-300">
              99% Accuracy
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Problem Agitation */}
      <section id="problem" className="py-20 px-4 bg-gradient-to-b from-gray-900 to-black">
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
      <section id="solution" className="py-20 px-4 bg-gradient-to-b from-black to-gray-900">
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
                    Your Patient's Entire History.
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
      <section id="value-props" className="py-20 px-4 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white animate-fadeInUp">
            Why Settle for Half a Solution?
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 animate-fadeInUp delay-100">
            You need more than a scribe. You need less than legacy bloat.
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
                      <p className="text-sm text-gray-400">Send prescriptions directly to pharmacies. No copy-paste required.</p>
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
                      <p className="text-sm text-gray-400">Order labs, track results, auto-notify patients—all in one place.</p>
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
                      <p className="text-sm text-gray-400">CPT codes selected automatically. Never leave money on the table.</p>
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