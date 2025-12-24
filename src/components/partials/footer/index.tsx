"use client";

import { Icon } from "@/components/ui/icon";
import Magnetic from "@/components/ui/magnetic";
import { SOCIALS } from "@/config/constants";
import { Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { href: "/", name: "Home" },
    { href: "/about", name: "About" },
    { href: "/projects", name: "Projects" },
    { href: "/articles", name: "Articles" },
  ];

  return (
    <footer className="bg-card border-border border-t pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* Top Section: CTA */}
        <div className="border-border/50 mb-20 flex flex-col items-center justify-between gap-8 border-b pb-20 md:flex-row">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Ready to <span className="text-primary">collaborate?</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Let&apos;s build something extraordinary together.
            </p>
          </div>
          <Link href="/contact">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold tracking-widest uppercase transition-all hover:scale-105 active:scale-95">
              Get In Touch
              <Icon
                name="arrow-right"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </button>
          </Link>
        </div>

        {/* Middle Section: Links & Info */}
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <Link
              href="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.png"
                alt="Foysal Ahmed Logo"
                width={48}
                height={48}
                className="size-12 rounded-full object-contain"
              />
              <div className="leading-tight">
                <p className="text-foreground text-lg font-bold tracking-tight">
                  FOYSAL AHMED
                </p>
                <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                  Application Developer
                </p>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Specializing in building exceptional digital experiences with a
              focus on performance, accessibility, and modern aesthetics.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="text-foreground mb-8 text-xs font-bold tracking-widest uppercase">
              Navigation
            </h3>
            <ul className="space-y-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary underline-effect hover:underline-effect-active text-sm font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-foreground mb-8 text-xs font-bold tracking-widest uppercase">
              Contact
            </h3>
            <ul className="space-y-6">
              <li>
                <a
                  href="mailto:foysalahmedmin@gmail.com"
                  className="group flex items-start gap-4"
                >
                  <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-10 items-center justify-center rounded-xl transition-colors">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-bold tracking-tighter uppercase">
                      Email Me
                    </p>
                    <p className="text-foreground text-sm font-medium">
                      foysalahmedmin@gmail.com
                    </p>
                  </div>
                </a>
              </li>
              <li>
                <div className="group flex items-start gap-4">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-bold tracking-tighter uppercase">
                      Location
                    </p>
                    <p className="text-foreground text-sm font-medium">
                      Dhaka, Bangladesh
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Socials */}
          <div>
            <h3 className="text-foreground mb-8 text-xs font-bold tracking-widest uppercase">
              Follow Me
            </h3>
            <div className="flex flex-wrap gap-4">
              {SOCIALS.map((social) => (
                <Magnetic key={social.name}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background border-border hover:bg-primary hover:text-primary-foreground flex size-12 items-center justify-center rounded-2xl border transition-all duration-300 hover:shadow-lg"
                    aria-label={social.name}
                  >
                    <Icon name={social.icon} className="size-5" />
                  </a>
                </Magnetic>
              ))}
            </div>
            <div className="mt-8">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Available for worldwide <br /> remote opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="border-border/50 mt-24 flex flex-col items-center justify-between gap-6 border-t pt-12 md:flex-row">
          <p className="text-muted-foreground text-xs">
            © {currentYear} Foysal Ahmed. Crafted with passion by yours truly.
          </p>
          <div className="flex items-center gap-8">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
