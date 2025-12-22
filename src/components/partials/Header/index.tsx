"use client";

import ThemeSwitcher from "@/components/ui/theme-switcher";
import useHash from "@/hooks/utils/use-hash";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useState } from "react";

type NavLink = {
  href: `#${string}`;
  name: string;
};

const navLinks = [
  { href: "/", name: "Home" },
  { href: "/about", name: "About" },
  { href: "/projects", name: "Projects" },
  { href: "/articles", name: "Articles" },
  { href: "/contact", name: "Contact" },
];

type THeaderProps = {
  className?: string;
}

const Header : React.FC<THeaderProps> = ({ className }) => {
  const { hash } = useHash();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => {
      const next = !prev;
      document.body.style.overflow = next ? "hidden" : "auto";
      return next;
    });
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = "auto";
  };

  const isActive = (href: string) => {
    const targetHash = href.replace("#", "");
    return hash === targetHash;
  };

  return (
    <>
      <header
        className={cn(
          "sticky left-0 right-0 top-0 z-50 h-16 bg-background/90 text-foreground shadow-sm backdrop-blur-md transition-all duration-300 ease-in-out",
          className,
        )}
      >
        <div className="flex h-full items-center justify-between px-8">
          <Link
            href="/"
            className="font-display text-xl font-medium tracking-tight transition-opacity duration-300 hover:opacity-80"
            aria-label="Home"
          >
            Foysal<span className="text-primary">.</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="container hidden flex-1 items-center gap-4 px-0 lg:flex lg:px-16">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "nav-link whitespace-nowrap",
                  isActive(link.href) && "active",
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <button
              className="flex flex-col space-y-1.5 focus:outline-none lg:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span
                className={cn(
                  "h-0.5 w-6 bg-foreground transition-all duration-300 ease-in-out",
                  isMobileMenuOpen && "translate-y-2 rotate-45",
                )}
              />
              <span
                className={cn(
                  "h-0.5 w-6 bg-foreground transition-all duration-300 ease-in-out",
                  isMobileMenuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "h-0.5 w-6 bg-foreground transition-all duration-300 ease-in-out",
                  isMobileMenuOpen && "-translate-y-2 -rotate-45",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col items-center justify-center bg-card transition-all duration-500",
          isMobileMenuOpen
            ? "visible translate-x-0 opacity-100"
            : "invisible translate-x-full opacity-50",
        )}
      >
        <nav className="flex flex-col items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "nav-link whitespace-nowrap",
                isActive(link.href) && "active",
              )}
              onClick={closeMobileMenu}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Header;
