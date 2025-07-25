import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Stethoscope, Users, Home, BookOpen, Award } from 'lucide-react';
import founderHeadshot from '@assets/Favorite-Aragon-Photo-1_1753409906439.jpeg';

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
                    className="w-48 h-48 mx-auto rounded-full object-cover object-top shadow-xl ring-4 ring-blue-50 dark:ring-blue-900"
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
                    My journey in medicine began on the front lines—as a college student scribbling through endless emergency 
                    department shifts, capturing every detail of each patient's story. This experience not only paid my way through 
                    school and opened the door to medical school, but also ingrained in me the vital importance of accurate, 
                    meaningful documentation in patient care.
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Today, after a decade in practice—including seven years caring for a rural community in Hillsboro, Texas—I 
                    can truthfully say that documentation is the most frustrating part of being a physician. Too often, it steals 
                    time from my patients, my family, and the practice of medicine itself. Traditional EMRs remain clunky, outdated, 
                    and designed for insurance companies, not clinicians or patients.
                  </p>
                  
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Everything changed when modern AI tools arrived. Voice recognition and advanced summarization drastically 
                    increased my efficiency and, for the first time, let me focus on my patients without losing track of 
                    documentation. But I saw the gap: <span className="font-semibold">nobody had built an EMR from the ground up, 
                    around modern AI.</span>
                  </p>
                  
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Whether seeing 20–30 clinic patients a day, rounding at the hospital, delivering babies, or assisting in 
                    surgery, I believe the heart of medicine is the human connection—something no EMR should ever get in the way of. 
                    That's why I built Clarafi: to get medicine back to medicine.
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
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
              In Honor of Clara
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center">
                <span className="font-semibold text-xl text-purple-600 dark:text-purple-400">Clarafi</span> is named in loving memory 
                of my grandmother, Clara—a proud member of the greatest generation and a dedicated registered nurse who touched 
                countless lives throughout her remarkable 103 years.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center">
                She passed away just months ago, during the creation of this EMR. As the matriarch of our family and a healthcare 
                professional who understood the importance of compassionate, thorough patient care, her legacy lives on in every 
                feature designed to help you provide better care to your patients.
              </p>
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