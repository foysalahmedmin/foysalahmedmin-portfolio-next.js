import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { ChevronDown, Play } from "lucide-react";
import Link from "next/link";
import React from "react";

const HeroSection: React.FC = () => {
  const youtubeVideoId = "UKpICjcmWZg";
  const youtubeVideoLink = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&loop=1&playlist=${youtubeVideoId}&controls=0&mute=1`;

  return (
    <section
      className={cn(
        "dark bg-background text-foreground relative flex min-h-screen flex-col justify-end overflow-hidden lg:justify-center"
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          style={{
            backgroundImage: "url('/images/hero-banner.png')",
            backgroundPosition: "70% 90%",
          }}
          className={cn("absolute inset-0 bg-cover bg-no-repeat")}
        >
          <div className="from-muted via-muted/50 absolute inset-0 bg-gradient-to-t to-transparent lg:bg-gradient-to-r" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container py-24 text-left">
        <div className="animate-fade-in mr-auto max-w-2xl space-y-12">
          {/* Modal Trigger */}
          <Modal>
            <Modal.Trigger
              shape="icon"
              variant="outline"
              className={cn(
                "inline-flex size-20 items-center justify-center rounded-full border-2 border-current"
              )}
            >
              <Play
                className="size-10 transition-transform group-hover:scale-110"
                strokeWidth={1}
              />
            </Modal.Trigger>

            <Modal.Backdrop>
              <Modal.Content className="max-w-[90vw] border-none bg-transparent p-0 sm:max-w-[80vw] lg:max-w-[70vw]">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    className="h-full w-full"
                    src={youtubeVideoLink}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </Modal.Content>
            </Modal.Backdrop>
          </Modal>

          {/* Text */}
          <div className={cn("space-y-4")}>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold uppercase md:text-6xl">
                Foysal Ahmed
              </h1>
              <p>Web Developer | Full Stack Engineer | System Engineer</p>
            </div>
            <div
              className="flex justify-start space-x-4"
              style={{ animationDelay: "0.3s" }}
            >
              <Link href="#about" className="button">
                <span>Learn More</span>
              </Link>
              <Link href="#contact" className="button button-outline">
                <span>Contact Me</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce md:block">
        <Link
          href="#about"
          className="text-foreground flex flex-col items-center text-sm transition-colors"
        >
          <span className="mb-2">Scroll</span>
          <ChevronDown className="size-6" />
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
