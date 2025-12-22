"use client";

import { ActiveLink } from "@/components/ui/active-link";
import { Button } from "@/components/ui/button";
import { useScrollPosition } from "@/hooks/ui/use-scroll-position";
import { useVisibleSection } from "@/hooks/utils/use-visible-section";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

// Types
type NavLink = {
  href: string;
  name: string;
};

type HeaderProps = {
  className?: string;
};

// Constants
const ALL_PAGE_NAV_LINKS: NavLink[] = [
  { href: "/", name: "Home" },
  { href: "/about", name: "About" },
  { href: "/projects", name: "Projects" },
  { href: "/articles", name: "Articles" },
  { href: "/contact", name: "Contact" },
] as const;

const HOME_PAGE_NAV_LINKS: NavLink[] = [
  { href: "#home", name: "Home" },
  { href: "#about", name: "About" },
  { href: "#projects", name: "Projects" },
  { href: "#articles", name: "Articles" },
  { href: "#contact", name: "Contact" },
] as const;

const VISIBLE_SECTIONS = ["home", "about", "projects", "articles", "contact"];

// Custom hook for mobile menu
const useMobileMenu = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      const newState = !prev;
      document.body.style.overflow = newState ? "hidden" : "auto";
      return newState;
    });
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = "auto";
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen, closeMobileMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return {
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  };
};

// Components
const Logo: React.FC = () => (
  <Link
    href="/"
    className="flex w-full items-center gap-2 text-xl font-medium transition-opacity duration-300 hover:opacity-80"
    aria-label="Home"
  >
    <Image
      src="/logo-star.png"
      alt="Logo"
      width={48}
      height={48}
      className="bg-primary size-12 rounded-full object-contain object-left"
      priority
    />
    <div className="pt-2 leading-4">
      <p className="dark:text-foreground text-primary">FOYSAL AHMED</p>
      <span className="text-xs font-thin">Application Developer</span>
    </div>
  </Link>
);

const NavItem: React.FC<{
  link: NavLink;
  visibleSection?: string;
  onClick?: () => void;
}> = ({ link, visibleSection, onClick }) => {
  const url = new URL(link.href, "http://localhost");
  const isHashed = !!url.hash;
  const isActive = visibleSection === url.hash.replace("#", "");

  const linkClassName = cn(
    "underline-effect foreground text-sm whitespace-nowrap uppercase transition-colors duration-200",
    {
      active: isActive,
    }
  );

  if (isHashed) {
    return (
      <Link href={link.href} className={linkClassName} onClick={onClick}>
        {link.name}
      </Link>
    );
  }

  return (
    <ActiveLink
      href={link.href}
      className={linkClassName}
      activeClassName="active"
      onClick={onClick}
    >
      {link.name}
    </ActiveLink>
  );
};

const DesktopNavigation: React.FC<{
  navLinks: NavLink[];
  visibleSection?: string;
}> = ({ navLinks, visibleSection }) => (
  <nav className="hidden flex-1 items-center justify-center gap-4 px-0 lg:flex lg:gap-6 lg:px-16">
    {navLinks.map((link, index) => (
      <NavItem
        key={`${link.href}-${index}`}
        link={link}
        visibleSection={visibleSection}
      />
    ))}
  </nav>
);

const MobileMenuButton: React.FC<{
  isOpen: boolean;
  onClick: () => void;
}> = ({ isOpen, onClick }) => (
  <button
    className="flex flex-col space-y-1.5 focus:outline-none lg:hidden"
    onClick={onClick}
    aria-label={isOpen ? "Close menu" : "Open menu"}
    aria-expanded={isOpen}
  >
    <span
      className={cn(
        "bg-foreground h-0.5 w-6 transition-all duration-300 ease-in-out",
        isOpen && "translate-y-2 rotate-45"
      )}
    />
    <span
      className={cn(
        "bg-foreground h-0.5 w-6 transition-all duration-300 ease-in-out",
        isOpen && "opacity-0"
      )}
    />
    <span
      className={cn(
        "bg-foreground h-0.5 w-6 transition-all duration-300 ease-in-out",
        isOpen && "-translate-y-2 -rotate-45"
      )}
    />
  </button>
);

const MobileNavigation: React.FC<{
  navLinks: NavLink[];
  visibleSection?: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ navLinks, visibleSection, isOpen, onClose }) => (
  <div
    className={cn(
      "bg-card fixed inset-0 z-40 flex h-20 flex-col items-center justify-center transition-all duration-500",
      isOpen
        ? "visible translate-x-0 opacity-100"
        : "invisible translate-x-full opacity-0"
    )}
    onClick={onClose}
  >
    <div className="container flex items-center justify-between py-4">
      <Logo />
      <button
        onClick={onClose}
        className="hover:bg-muted rounded-md p-2 transition-colors focus:outline-none"
        aria-label="Close menu"
      >
        <X className="size-8" />
      </button>
    </div>
    <nav
      className="flex flex-col items-center gap-6"
      onClick={(e) => e.stopPropagation()}
    >
      {[...navLinks, { href: "/contact", name: "Contact Us" }].map(
        (link, index) => (
          <NavItem
            key={`mobile-${link.href}-${index}`}
            link={link}
            visibleSection={visibleSection}
            onClick={onClose}
          />
        )
      )}
    </nav>
  </div>
);

const ContactButton: React.FC = () => (
  <Link className="hidden lg:inline-block" href="/contact">
    <Button className="foreground" asChild={true} variant="outline">
      <span>CONTACT</span>
    </Button>
  </Link>
);

// Main Header Component
const Header: React.FC<HeaderProps> = ({ className }) => {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const navLinks = isHomePage ? HOME_PAGE_NAV_LINKS : ALL_PAGE_NAV_LINKS;

  const { scrollTop, scrollDirection } = useScrollPosition();
  const { visibleSection } = useVisibleSection(VISIBLE_SECTIONS, 0.5);
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
    useMobileMenu();

  // Header styling based on scroll and page
  const headerClassName = cn(
    "text-foreground top-0 right-0 left-0 z-50 h-20 bg-transparent backdrop-blur-xs transition-all duration-300 ease-in-out",
    {
      "dark fixed": isHomePage,
      "bg-card sticky": !isHomePage,
      "bg-background/95 shadow-sm": scrollTop > 80 && isHomePage,
      "bg-background/95": isMobileMenuOpen && isHomePage,
      "-translate-y-full":
        scrollDirection === "down" && scrollTop > 80 && isHomePage,
      "translate-y-0":
        (scrollDirection === "up" && isHomePage) ||
        (scrollTop <= 80 && isHomePage),
    },
    className
  );

  return (
    <>
      <header className={headerClassName}>
        <div className="container flex h-full items-center justify-between">
          <Logo />

          <DesktopNavigation
            navLinks={navLinks}
            visibleSection={visibleSection || undefined}
          />

          <div className="flex items-center gap-4">
            <ContactButton />
            <MobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={toggleMobileMenu}
            />
          </div>
        </div>
      </header>

      <MobileNavigation
        navLinks={navLinks}
        visibleSection={visibleSection || undefined}
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
      />
    </>
  );
};

export default Header;
