import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Stethoscope, Users, Home, BookOpen, Award } from 'lucide-react';
import founderHeadshot from '@assets/Favorite-Aragon-Photo-1_1753409906439.jpeg';
import claraPhoto from '@assets/1950s Nurse copy Large_1753477880884.png';

export default function AboutUs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="mb-8">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Our Story
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 text-center max-w-3xl mx-auto">
            Built by physicians who understand the real challenges of modern healthcare documentation
          </p>
        </div>
      </section>

      {/* Founder Story Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 shadow-xl border-0 bg-white dark:bg-gray-800">
            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Professional headshot */}
              <div className="md:col-span-1">
                <div className="relative">
                  <img 
                    src={founderHeadshot} 
                    alt="Clarafi Founder"
                    className="w-56 h-56 mx-auto rounded-full object-cover object-top shadow-xl ring-4 ring-blue-50 dark:ring-blue-900"
                  />
                </div>
              </div>

              {/* Story Content */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    From ER to Innovation
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    My journey in medicine began in the bustling emergency rooms where I worked as a medical scribe during college. 
                    Documenting every moment of patient care—from initial triage to discharge—I witnessed firsthand the critical 
                    importance of accurate, efficient medical documentation.
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    This experience shaped my understanding of what physicians truly need: a documentation system that works 
                    <span className="font-semibold"> with</span> them, not against them. After years of working with various EMR systems 
                    and understanding their limitations, I set out to create something better.
                  </p>
                  
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Today, as a practicing physician in a small town I love, I experience the same documentation challenges 
                    you face every day. That's why Clarafi isn't just another EMR—it's built by someone who truly understands 
                    the daily realities of medical practice.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* The Name Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
            <div className="flex items-center justify-center mb-6">
              <Heart className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
              In Honor of Clara
            </h2>
            <div className="grid md:grid-cols-2 gap-8 items-center mb-6">
              {/* Clara's Photo */}
              <div className="order-2 md:order-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-800 dark:to-blue-800 rounded-lg blur-2xl opacity-30"></div>
                  <div className="relative w-72 h-80 mx-auto rounded-lg overflow-hidden shadow-2xl">
                    <img 
                      src={claraPhoto} 
                      alt="Clara - Registered Nurse"
                      className="absolute inset-0 w-[110%] h-[110%] -top-[5%] -left-[5%] object-cover sepia-[.30] hover:sepia-0 transition-all duration-700"
                    />
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">Clara - A dedicated nurse who served with compassion</p>
                  </div>
                </div>
              </div>
              
              {/* Text Content */}
              <div className="order-1 md:order-2 space-y-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <span className="font-semibold text-xl text-purple-600 dark:text-purple-400">Clarafi</span> is named in loving memory 
                  of my grandmother, Clara—a dedicated registered nurse who touched countless lives throughout her remarkable 103 years.
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  She passed away just months ago, during the creation of this EMR. As the matriarch of our family and a healthcare 
                  professional who understood the importance of compassionate, thorough patient care, her legacy lives on in every 
                  feature designed to help you provide better care to your patients.
                </p>
              </div>
            </div>
            <div className="max-w-3xl mx-auto">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center italic">
                Her dedication to nursing excellence inspires our commitment to making your documentation work as seamless as possible, 
                so you can focus on what matters most—your patients.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Family First</h3>
              <p className="text-gray-600 dark:text-gray-300">
                As a parent of five children and a devoted spouse, I understand the importance of work-life balance. 
                Clarafi is designed to give you more time with those who matter most.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Community Care</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Working in a small town has taught me the value of personal connections in healthcare. 
                Every feature is built with the understanding that behind every chart is a real person.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Love What You Do</h3>
              <p className="text-gray-600 dark:text-gray-300">
                I wake up every day genuinely excited about my work. Clarafi is built to preserve that joy 
                in medicine by removing the frustrations that bog us down.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto max-w-4xl text-center">
          <BookOpen className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Our Mission
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
            To empower physicians with documentation tools that respect their time, enhance their practice, 
            and restore joy to the practice of medicine—because when physicians thrive, patients receive better care.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Have questions or want to share your story? We'd love to hear from you.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Built with ❤️ by physicians, for physicians
          </p>
        </div>
      </section>
    </div>
  );
}