"use client";

import Magnetic from "@/components/ui/magnetic";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalTrigger,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const slides = [
  {
    image: "/images/hero-1.jpg",
    title: "Full Stack Developer",
    subtitle: "Building scalable web applications with MERN stack.",
    highlight: "Full Stack",
  },
  {
    image: "/images/hero-2.jpg",
    title: "AI & Automation",
    subtitle: "Integrating cutting-edge AI models and automating repetitive workflows.",
    highlight: "AI &",
  },
  {
    image: "/images/hero-3.jpg",
    title: "System Architect",
    subtitle: "Designing complex infrastructures optimized for high-traffic environments.",
    highlight: "System",
  },
];

const HeroSection: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const youtubeVideoId = "UKpICjcmWZg";
  const youtubeVideoLink = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&loop=1&playlist=${youtubeVideoId}&controls=0&mute=1`;

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
    <section className="bg-background relative h-screen min-h-[800px] w-full overflow-hidden">
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
                selectedIndex === index ? "opacity-100 scale-100" : "opacity-0 scale-110"
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
      <div className="relative z-10 container mx-auto flex h-full flex-col justify-center px-6">
        <div className="max-w-4xl">
          <div className="fade-down active mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-background/20 backdrop-blur-md px-5 py-2 text-[11px] font-bold tracking-[0.2em] uppercase text-primary">
            <Sparkles className="size-4 animate-pulse" />
            <span>Available for new projects</span>
          </div>

          <div className="overflow-hidden">
            <h1 
              className={cn(
                "text-foreground text-6xl leading-[0.9] font-black tracking-tighter md:text-8xl lg:text-9xl transition-all duration-700 ease-out",
                isTransitioning ? "opacity-0 translate-y-10 skew-y-6" : "opacity-100 translate-y-0 skew-y-0"
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
              "text-muted-foreground/80 mt-10 max-w-2xl text-xl leading-relaxed md:text-2xl transition-all duration-700 delay-100 ease-out",
              isTransitioning ? "opacity-0 translate-y-10" : "opacity-100 translate-y-0"
            )}
          >
            {slides[selectedIndex].subtitle}
          </p>

          <div className="mt-14 flex flex-wrap items-center gap-6 fade-up active delay-300">
            <Magnetic strength={0.2}>
              <Link
                href="/projects"
                className="group bg-primary text-primary-foreground relative flex items-center gap-3 rounded-2xl px-10 py-5 font-bold transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(var(--primary),0.3)]"
              >
                <span className="relative z-10">View Portfolio</span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 -translate-x-full rounded-2xl bg-white/10 transition-transform duration-300 group-hover:translate-x-0" />
              </Link>
            </Magnetic>

            <Modal>
              <ModalTrigger
                variant="none"
                className="glass hover:bg-muted/50 flex items-center gap-4 rounded-2xl px-10 py-5 font-bold transition-all"
              >
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                  <Play className="fill-primary ml-1 size-5" />
                </div>
                <span>Watch Intro</span>
              </ModalTrigger>

              <ModalBackdrop>
                <ModalContent className="max-w-[90vw] border-none bg-transparent p-0 sm:max-w-[80vw] lg:max-w-[70vw]">
                  <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] bg-black shadow-2xl">
                    <iframe
                      className="h-full w-full"
                      src={youtubeVideoLink}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </ModalContent>
              </ModalBackdrop>
            </Modal>
          </div>
        </div>
      </div>

      {/* Modern Progress Indicators */}
      <div className="absolute right-16 bottom-16 z-10 flex flex-col gap-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => handleSlideChange(i)}
            className="group flex items-center gap-4"
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
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                selectedIndex === i
                  ? "bg-primary w-12"
                  : "bg-muted-foreground/30 w-6 group-hover:w-8"
              )}
            />
          </button>
        ))}
      </div>

      {/* Unique Scroll indicator */}
      <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2">
        <Link href="#about" className="flex flex-col items-center gap-3">
          <div className="border-muted-foreground/20 h-12 w-7 rounded-full border-2 p-1 relative">
            <div className="bg-primary h-2 w-full rounded-full animate-bounce-slow absolute top-1 left-0 right-0 px-1" />
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
