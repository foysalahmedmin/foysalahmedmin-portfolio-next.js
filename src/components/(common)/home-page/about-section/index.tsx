"use client";

import { Button } from "@/components/ui/button";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";
import { ArrowRight, CheckCircle2, Quote } from "lucide-react";
import Link from "next/link";
import React from "react";

const AboutSection: React.FC = () => {
  const highlights = [
    "Modular & Scalable Backend",
    "Interactive Frontend with Next.js",
    "System Architecture Optimization",
    "Clean & Maintainable Codebase",
  ];

  return (
    <section id="about" className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-20 lg:grid-cols-2 lg:items-center">
          {/* Left: Interactive Card / Image */}
          <div className="fade-left relative">
            <div className="group relative aspect-square max-w-[500px] overflow-hidden rounded-3xl">
              <img
                src="/images/profile.png"
                alt="Foysal Ahmed"
                className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
              <div className="from-background/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>

            {/* Float Card */}
            <div className="bg-card border-border animate-float absolute -right-6 -bottom-10 max-w-[280px] rounded-2xl border p-6 shadow-2xl md:right-10">
              <Quote className="text-primary mb-4 size-8 opacity-20" />
              <p className="text-sm leading-relaxed font-medium italic">
                "PART OF NATURE"
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="bg-primary h-0.5 w-8" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  Foysal Ahmed
                </span>
              </div>
            </div>

            {/* Background elements */}
            <div className="bg-primary/5 absolute -top-10 -left-10 -z-10 size-64 rounded-full blur-3xl" />
          </div>

          {/* Right: Text Content */}
          <div className="fade-right space-y-8">
            <SectionTitle variant="start" className="mb-0">
              <Subtitle>Brief Introduction</Subtitle>
              <Title className="lg:text-6xl">
                Dedicated Full-Stack{" "}
                <span className="text-primary">Software Architect</span>
              </Title>
            </SectionTitle>

            <p className="text-muted-foreground text-lg leading-relaxed">
              I am a{" "}
              <span className="text-primary font-bold">
                Full-Stack Architect
              </span>
              with expertise in designing and building intelligent, scalable
              systems across web, mobile, and backend platforms. I architect
              projects end-to-end, creating robust business logic-driven
              solutions, implementing high-performance web and mobile
              applications, optimizing databases (SQL & NoSQL), and integrating
              AI and automation workflows. My focus is on delivering
              maintainable, efficient, and future-proof systems that provide
              exceptional experiences for users and empower businesses.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {highlights.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-primary size-5" />
                  <span className="text-foreground/80 text-sm font-bold">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-8">
              <Link href="/about">
                <Button
                  size="lg"
                  className="group rounded-xl px-10 font-bold tracking-widest uppercase"
                >
                  More About Me{" "}
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border-background bg-muted flex size-10 items-center justify-center rounded-full border-2 text-[10px] font-bold"
                  >
                    {i === 3 ? "20+" : "🚀"}
                  </div>
                ))}
                <div className="flex flex-col justify-center pl-6">
                  <span className="text-xs font-bold tracking-tight uppercase">
                    20+ Projects Completed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
