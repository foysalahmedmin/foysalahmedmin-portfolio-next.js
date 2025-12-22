"use client";

import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import React from "react";

const ContactCTASection: React.FC = () => {
  return (
    <section id="contact-cta" className="py-24 lg:py-32">
      <div className="container px-6 mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-primary-foreground md:px-16 md:py-24">
          {/* Background decoration */}
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-black/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner backdrop-blur-sm">
              👋
            </span>
            <h2 className="mb-6 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
              Have a Project in Mind? Let's Build Something Amazing.
            </h2>
            <p className="mb-10 max-w-xl text-lg opacity-90 md:text-xl">
              I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold uppercase tracking-wide">
                  Start a Conversation <Send className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="mailto:foysalahmedmin@gmail.com">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold uppercase tracking-wide">
                  <Mail className="mr-2 size-4" /> foysalahmedmin@gmail.com
                </Button>
              </Link>
            </div>
            
            <div className="mt-12 flex gap-8">
                <div className="flex items-center gap-2">
                    <MessageSquare className="size-5 opacity-70" />
                    <span className="text-sm font-medium">Quick Reply</span>
                </div>
                <div className="flex items-center gap-2">
                    <Send className="size-5 opacity-70" />
                    <span className="text-sm font-medium">Available for Hire</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactCTASection;
