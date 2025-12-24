"use client";

import { Button } from "@/components/ui/button";
import Magnetic from "@/components/ui/magnetic";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920&auto=format&fit=crop",
    title: "Full Stack Developer",
    subtitle:
      "Designing and building scalable, high-performance applications end to end.",
    highlight: "Full Stack",
  },
  {
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1920&auto=format&fit=crop",
    title: "AI & Automation",
    subtitle:
      "Designing and implementing AI-driven workflows to optimize processes.",
    highlight: "AI &",
  },
  {
    image:
      "https://images.unsplash.com/photo-1581090700227-1e37b190418e?q=80&w=1920&auto=format&fit=crop",
    title: "System Architect",
    subtitle:
      "Designing robust system architectures for scalable, high-traffic platforms.",
    highlight: "System",
  },
];

const HeroSection: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedIndex((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 500);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSlideChange = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex(index);
      setIsTransitioning(false);
    }, 500);
  };

  return (
    <section className="bg-background relative flex min-h-[36rem] w-full max-w-screen flex-col overflow-hidden md:min-h-[40rem] lg:min-h-[46rem]">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="animate-pulse-slow bg-primary/10 absolute top-1/4 -left-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div
          className="animate-pulse-slow bg-primary/5 absolute -right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ animationDelay: "2s" }}
        />

        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                selectedIndex === index
                  ? "scale-100 opacity-100"
                  : "scale-110 opacity-0"
              )}
            >
              <img
                src={slide.image || "/images/hero-banner.png"}
                alt=""
                className="h-full w-full object-cover brightness-[0.2] grayscale"
              />
              <div className="from-background/80 to-background absolute inset-0 bg-gradient-to-b via-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto mb-10 flex h-full flex-1 flex-col justify-center px-6 py-24">
        <div className="flex max-w-4xl flex-1 flex-col">
          <div className="fade-down active border-primary/20 bg-background/20 text-primary mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-md">
            <Sparkles className="text-foreground size-4 animate-pulse" />
            <span>Available for new projects</span>
          </div>

          <div className="overflow-hidden">
            <h1
              className={cn(
                "text-foreground text-5xl leading-[0.9] font-black tracking-tighter transition-all duration-700 ease-out md:text-7xl lg:text-9xl",
                isTransitioning
                  ? "translate-y-10 skew-y-6 opacity-0"
                  : "translate-y-0 skew-y-0 opacity-100"
              )}
            >
              {slides[selectedIndex].title.split(" ").map((word, i) => (
                <span
                  key={i}
                  className={cn(
                    word === slides[selectedIndex].highlight
                      ? "text-primary text-glow"
                      : "text-foreground"
                  )}
                >
                  {word}{" "}
                </span>
              ))}
            </h1>
          </div>

          <p
            className={cn(
              "text-muted-foreground/80 mt-6 mb-8 max-w-2xl text-xl leading-relaxed transition-all delay-100 duration-700 ease-out md:text-2xl",
              isTransitioning
                ? "translate-y-10 opacity-0"
                : "translate-y-0 opacity-100"
            )}
          >
            {slides[selectedIndex].subtitle}
          </p>

          <div className="fade-up active flex flex-wrap items-center gap-2 delay-300 md:gap-4">
            <Magnetic strength={0.2}>
              <Link href="/about">
                <Button className="primary">
                  <span className="relative z-10">About Me</span>
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </Magnetic>
            <Magnetic strength={0.2}>
              <Link href="/projects">
                <Button variant="outline" className="primary">
                  <span className="relative z-10">View Projects</span>
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </Magnetic>
          </div>
        </div>
      </div>

      {/* Modern Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-row gap-6 md:bottom-12">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => handleSlideChange(i)}
            className="group flex cursor-pointer flex-col items-center gap-1"
          >
            <span
              className={cn(
                "text-[10px] font-bold transition-all duration-500",
                selectedIndex === i
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
            >
              0{i + 1}
            </span>
            <div className="flex w-8 items-center justify-center lg:w-12">
              <div
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  selectedIndex === i
                    ? "bg-primary w-8 lg:w-12"
                    : "bg-muted-foreground/30 w-4 group-hover:w-6 lg:w-6 lg:group-hover:w-8"
                )}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Unique Scroll indicator */}
      <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 lg:bottom-28">
        <Link href="#about" className="flex flex-col items-center gap-3">
          <div className="border-muted-foreground/20 relative h-12 w-8 rounded-full border-2 p-1">
            <div className="bg-primary animate-bounce-slow absolute top-3 right-0.5 left-0.5 h-2 w-6 rounded-full px-1" />
          </div>
          <span className="text-muted-foreground/50 text-[10px] font-bold tracking-[0.3em] uppercase">
            Scroll
          </span>
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
