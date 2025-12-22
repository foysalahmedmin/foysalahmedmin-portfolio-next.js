"use client";

import Magnetic from "@/components/ui/magnetic";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalTrigger,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
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
    title: "UI/UX Focused",
    subtitle: "Creating beautiful, interactive, and user-friendly interfaces.",
    highlight: "UI/UX",
  },
  {
    image: "/images/hero-3.jpg",
    title: "System Engineer",
    subtitle: "Optimizing Performance & Architecture for high-load systems.",
    highlight: "System",
  },
];

const HeroSection: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const youtubeVideoId = "UKpICjcmWZg";
  const youtubeVideoLink = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&loop=1&playlist=${youtubeVideoId}&controls=0&mute=1`;

  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-background relative h-screen min-h-[800px] w-full overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="animate-pulse-slow bg-primary/10 absolute top-1/4 -left-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div
          className="animate-pulse-slow bg-primary/5 absolute -right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ animationDelay: "2s" }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={slides[selectedIndex].image || "/images/hero-banner.png"}
              alt=""
              className="h-full w-full object-cover brightness-[0.2] grayscale"
            />
            <div className="from-background/80 to-background absolute inset-0 bg-gradient-to-b via-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto flex h-full flex-col justify-center px-6">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass border-primary/20 text-primary mb-8 inline-flex items-center gap-3 rounded-full px-5 py-2 text-[11px] font-bold tracking-[0.2em] uppercase"
          >
            <Sparkles className="size-4 animate-pulse" />
            <span>Available for new projects</span>
          </motion.div>

          <div className="overflow-visible">
            <h1 className="text-foreground text-6xl leading-[0.9] font-black tracking-tighter md:text-8xl lg:text-9xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedIndex}
                  initial={{ opacity: 0, y: 40, skewY: 7 }}
                  animate={{ opacity: 1, y: 0, skewY: 0 }}
                  exit={{ opacity: 0, y: -40, skewY: -7 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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
                </motion.div>
              </AnimatePresence>
            </h1>
          </div>

          <motion.p
            key={`p-${selectedIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-muted-foreground/80 mt-10 max-w-2xl text-xl leading-relaxed md:text-2xl"
          >
            {slides[selectedIndex].subtitle}
          </motion.p>

          <div className="mt-14 flex flex-wrap items-center gap-6">
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
            onClick={() => setSelectedIndex(i)}
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
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2"
      >
        <Link href="#about" className="flex flex-col items-center gap-3">
          <div className="border-muted-foreground/20 h-12 w-7 rounded-full border-2 p-1">
            <motion.div
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-primary h-2 w-full rounded-full"
            />
          </div>
          <span className="text-muted-foreground/50 text-[10px] font-bold tracking-[0.3em] uppercase">
            Scroll
          </span>
        </Link>
      </motion.div>
    </section>
  );
};

export default HeroSection;
