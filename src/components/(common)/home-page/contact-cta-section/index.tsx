"use client";

import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Send, Smile } from "lucide-react";
import Link from "next/link";
import React from "react";

const ContactCTASection: React.FC = () => {
  return (
    <section id="contact" className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-3xl px-6 py-16 md:px-16 md:py-24">
          {/* Background decoration */}
          <div className="bg-background/10 absolute -top-24 -right-24 size-96 rounded-full blur-3xl" />
          <div className="bg-background/10 absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="bg-primary/20 mb-6 inline-flex size-16 items-center justify-center rounded-2xl text-3xl shadow-inner backdrop-blur-sm">
              <Smile className="size-20" />
            </span>
            <h2 className="mb-6 max-w-3xl text-2xl leading-tight font-bold md:text-5xl">
              Have a Project in Mind? Let's Build Something Amazing.
            </h2>
            <p className="mb-10 max-w-xl opacity-90 md:text-xl">
              I'm always open to discussing new projects, creative ideas or
              opportunities to be part of your visions.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="default"
                  className="font-bold tracking-wide uppercase"
                >
                  Conversation <Send className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="mailto:foysalahmedmin@gmail.com">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold tracking-wide uppercase"
                >
                  <Mail className="mr-2 size-4" /> Email Me
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex gap-8">
              <div className="flex items-center gap-2">
                <MessageSquare className="hidden size-5 opacity-70 md:inline-block" />
                <span className="text-sm font-medium">Quick Reply</span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="hidden size-5 opacity-70 md:inline-block" />
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
