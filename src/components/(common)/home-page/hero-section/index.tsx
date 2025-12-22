"use client";

import { Modal, ModalBackdrop, ModalContent, ModalTrigger } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronDown, Play } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

const slides = [
  {
    image: "/images/hero-1.jpg",
    title: "Full Stack Developer",
    subtitle: "Building scalable web applications with MERN stack.",
  },
  {
    image: "/images/hero-2.jpg",
    title: "UI/UX Focused",
    subtitle: "Creating beautiful, interactive, and user-friendly interfaces.",
  },
  {
    image: "/images/hero-3.jpg",
    title: "System Engineer",
    subtitle: "Optimizing Performance & Architecture for high-load systems.",
  }
];

const HeroSection: React.FC = () => {
  const youtubeVideoId = "UKpICjcmWZg";
  const youtubeVideoLink = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&loop=1&playlist=${youtubeVideoId}&controls=0&mute=1`;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  return (
    <section className="relative h-screen min-h-[700px] w-full overflow-hidden bg-background">
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div key={index} className="relative h-full min-w-full flex-[0_0_100%]">
              <img 
                src={slide.image || "/images/hero-banner.png"} 
                alt={slide.title}
                className="h-full w-full object-cover grayscale brightness-[0.3]" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container relative z-10 flex h-full flex-col justify-center px-6 mx-auto">
        <div className="max-w-3xl">
          <div className="fade-down mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Available for new projects
          </div>

          <div className="overflow-hidden">
             <h1 className="fade-up text-5xl font-bold tracking-tight text-foreground md:text-7xl lg:text-8xl">
                {slides[selectedIndex].title.split(" ").map((word, i) => (
                    <span key={i} className={cn(i === 2 ? "text-primary" : "")}>{word} </span>
                ))}
             </h1>
          </div>

          <p className="fade-up mt-8 max-w-xl text-lg text-muted-foreground transition-all duration-500 md:text-xl" style={{ animationDelay: "0.2s" }}>
             {slides[selectedIndex].subtitle}
          </p>

          <div className="fade-up mt-12 flex flex-wrap gap-4" style={{ animationDelay: "0.4s" }}>
             <Link href="/projects">
                <button className="group relative overflow-hidden rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                    <span className="relative z-10 flex items-center gap-2">
                        View Portfolio <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0" />
                </button>
             </Link>
             
             <Modal>
                <ModalTrigger
                    variant="outline"
                    className="flex items-center gap-3 rounded-xl border-border bg-card px-8 py-4 font-bold transition-all hover:bg-muted"
                >
                    <Play className="size-5 fill-primary text-primary" />
                    Watch Intro
                </ModalTrigger>

                <ModalBackdrop>
                    <ModalContent className="max-w-[90vw] border-none bg-transparent p-0 sm:max-w-[80vw] lg:max-w-[70vw]">
                        <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
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

      {/* Progress Indicators */}
      <div className="absolute bottom-12 right-12 z-10 flex gap-2">
         {slides.map((_, i) => (
            <button 
                key={i} 
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                    "h-1.5 transition-all duration-500 rounded-full",
                    selectedIndex === i ? "w-8 bg-primary" : "w-4 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
            />
         ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <Link href="#about" className="flex flex-col items-center gap-2 text-muted-foreground/50 transition-colors hover:text-primary">
          <span className="text-[10px] font-bold uppercase tracking-widest">Explore</span>
          <ChevronDown className="size-5" />
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
