"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Award, TrendingUp, Users } from "lucide-react";

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const benefits = [
    {
      icon: ShieldCheck,
      title: "Verified Marketplace",
      description: "Access to serious collectors actively seeking authenticated luxury",
    },
    {
      icon: Award,
      title: "Premium Positioning",
      description: "Inventory positioned alongside institutional-grade sellers",
    },
    {
      icon: TrendingUp,
      title: "Higher Returns",
      description: "Elite marketplace commands elite prices for verified inventory",
    },
    {
      icon: Users,
      title: "Curated Community",
      description: "Invitation-only network. No open registration.",
    },
  ];

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="font-serif text-6xl md:text-7xl mb-6 font-bold">
            <span className="text-gradient-luxury">Apply to Sell ✨</span>
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed font-light">
            🔒 Invitation-only marketplace. We curate our seller community to maintain institutional-grade standards of quality and authenticity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-effect p-8 hover:glass-gold transition-all duration-500 hover:scale-105 rounded-lg"
              >
                <Icon className="w-10 h-10 text-gradient-gold mb-4" />
                <h3 className="text-white text-xl font-semibold mb-3">
                  {benefit.title}
                </h3>
                <p className="text-white/60 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="glass-effect p-8 md:p-12 mb-8 rounded-lg">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-sm font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-gradient-gold text-sm font-semibold">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h2 className="font-serif text-3xl text-gold mb-6">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                  placeholder="+44 7700 900000"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                  placeholder="Your business or brand name"
                />
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h2 className="font-serif text-3xl text-gold mb-6">
                Selling Experience
              </h2>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  What categories will you sell?
                </label>
                <div className="space-y-3">
                  {["Trainers", "Streetwear", "Luxury Fashion", "Accessories"].map(
                    (category) => (
                      <label
                        key={category}
                        className="flex items-center space-x-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-5 h-5 bg-black border-2 border-white/20 checked:bg-gold checked:border-gold focus:outline-none transition-colors"
                        />
                        <span className="text-white">{category}</span>
                      </label>
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Previous selling experience
                </label>
                <select className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors">
                  <option>Select your experience level</option>
                  <option>No previous experience</option>
                  <option>1-2 years</option>
                  <option>3-5 years</option>
                  <option>5+ years</option>
                </select>
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Estimated monthly inventory
                </label>
                <select className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors">
                  <option>Select estimated volume</option>
                  <option>1-5 items</option>
                  <option>6-15 items</option>
                  <option>16-30 items</option>
                  <option>30+ items</option>
                </select>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h2 className="font-serif text-3xl text-gold mb-6">
                Why FlipRepublic?
              </h2>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Tell us about your inventory and why you want to join
                </label>
                <textarea
                  rows={6}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors resize-none"
                  placeholder="Share details about the items you plan to sell, your sourcing methods, and what makes you a good fit for our curated marketplace..."
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Social media or website (Optional)
                </label>
                <input
                  type="url"
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                  placeholder="https://instagram.com/yourbrand"
                />
              </div>
              <div className="bg-gold/10 border border-gold/30 p-6">
                <p className="text-white/70 text-sm leading-relaxed">
                  Applications are reviewed within 5-7 business days. We carefully
                  evaluate each submission to ensure alignment with our marketplace
                  standards. You will receive an email with our decision.
                </p>
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="disabled:opacity-30"
            >
              Previous
            </Button>
            {currentStep < totalSteps ? (
              <Button
                variant="primary"
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
              >
                Continue
              </Button>
            ) : (
              <Button variant="primary">Submit Application</Button>
            )}
          </div>
        </div>

        <div className="text-center text-white/50 text-sm">
          <p>
            By submitting this application, you agree to our Terms of Service and
            Seller Guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}
