"use client";

import { ActiveLink } from "@/components/ui/active-link";
import { Button } from "@/components/ui/button";
import { useScrollPosition } from "@/hooks/ui/use-scroll-position";
import { useVisibleSection } from "@/hooks/utils/use-visible-section";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/setting-slice";
import {
  Briefcase,
  Home,
  Mail,
  Monitor,
  Moon,
  PenTool,
  Sun,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

// Types
type NavLink = {
  href: string;
  name: string;
  icon?: React.ElementType;
};

type HeaderProps = {
  className?: string;
};

// Constants
const ALL_PAGE_NAV_LINKS: NavLink[] = [
  { href: "/", name: "Home", icon: Home },
  { href: "/about", name: "About", icon: User },
  { href: "/projects", name: "Projects", icon: Briefcase },
  { href: "/articles", name: "Articles", icon: PenTool },
  { href: "/contact", name: "Contact", icon: Mail },
] as const;

const HOME_PAGE_NAV_LINKS: NavLink[] = [
  { href: "#home", name: "Home", icon: Home },
  { href: "#about", name: "About", icon: User },
  { href: "#projects", name: "Projects", icon: Briefcase },
  { href: "#articles", name: "Articles", icon: PenTool },
  { href: "#contact", name: "Contact", icon: Mail },
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
      src="/logo.png"
      alt="Logo"
      width={48}
      height={48}
      className="size-12 rounded-full object-contain object-left"
      priority
    />
    <div className="leading-4">
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
  const pathname = usePathname();

  // For non-hashed links, check exact path match
  const isPathActive = !isHashed && pathname === link.href;
  const isLinkActive = isHashed ? isActive : isPathActive;

  const linkClassName = cn(
    "relative flex items-center gap-2 text-sm font-medium uppercase tracking-widest transition-all duration-300",
    isLinkActive
      ? "text-foreground opacity-100"
      : "text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
  );

  const activeIndicator = (
    <span
      className={cn(
        "bg-foreground absolute -bottom-1.5 left-0 h-0.5 transition-all duration-300",
        isLinkActive ? "w-full" : "w-0"
      )}
    />
  );

  if (isHashed) {
    return (
      <Link href={link.href} className={linkClassName} onClick={onClick}>
        {link.icon && <link.icon className="size-4" />}
        {link.name}
        {activeIndicator}
      </Link>
    );
  }

  return (
    <ActiveLink
      href={link.href}
      className={linkClassName}
      activeClassName="!opacity-100 !text-foreground"
      onClick={onClick}
    >
      {link.icon && <link.icon className="size-4" />}
      {link.name}
      {/* Active dot for non-hashed pages */}
      <span
        className={cn(
          "bg-foreground absolute -bottom-1.5 left-0 h-0.5 transition-all duration-300",
          pathname === link.href ? "w-full" : "w-0"
        )}
      />
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
    className="group z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 focus:outline-none lg:hidden"
    onClick={onClick}
    aria-label={isOpen ? "Close menu" : "Open menu"}
    aria-expanded={isOpen}
  >
    <span
      className={cn(
        "bg-foreground h-0.5 w-6 rounded-full transition-all duration-300 ease-out",
        isOpen && "translate-y-2 rotate-45"
      )}
    />
    <span
      className={cn(
        "bg-foreground h-0.5 w-6 rounded-full transition-all duration-300 ease-out",
        isOpen && "w-0 opacity-0"
      )}
    />
    <span
      className={cn(
        "bg-foreground h-0.5 w-6 rounded-full transition-all duration-300 ease-out",
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
}> = ({ navLinks, visibleSection, isOpen, onClose }) => {
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-xl transition-all duration-500",
        isOpen
          ? "bg-background/90 visible opacity-100"
          : "bg-background/0 pointer-events-none invisible opacity-0"
      )}
    >
      {/* Decorative background blobs */}
      <div className="bg-primary/20 absolute top-1/4 -left-20 size-96 rounded-full blur-[100px]" />
      <div className="bg-secondary/20 absolute -right-20 bottom-1/4 size-96 rounded-full blur-[100px]" />

      <nav
        className="relative z-10 flex flex-col items-center gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        {[...navLinks].map((link, index) => {
          const isActive = visibleSection === link.href.replace("#", "");
          return (
            <Link
              key={`mobile-${link.href}-${index}`}
              href={link.href}
              onClick={onClose}
              className={cn(
                "hover:text-primary text-4xl font-black tracking-tight transition-all duration-500",
                isOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <span className="flex items-center gap-4">
                {link.icon && <link.icon className="size-8 stroke-[2.5]" />}
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "absolute bottom-20 transition-all delay-300 duration-700",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        )}
      >
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Build . Design . Innovate
        </p>
      </div>
    </div>
  );
};

const ThemeToggler: React.FC = () => {
  const { theme } = useAppSelector((state) => state.setting);
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        shape="icon"
        className="text-foreground hover:bg-muted"
        aria-label="Toggle theme"
      >
        <Monitor className="size-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      shape="icon"
      onClick={() => dispatch(toggleTheme())}
      className="text-foreground hover:bg-muted"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="size-5" />
      ) : theme === "light" ? (
        <Moon className="size-5" />
      ) : (
        <Monitor className="size-5" />
      )}
    </Button>
  );
};

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
    "text-foreground top-0 right-0 left-0 z-50 h-20 bg-background/50 backdrop-blur-xs transition-all duration-300 ease-in-out",
    {
      fixed: isHomePage,
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

          <div className="flex items-center gap-2 lg:gap-4">
            <ThemeToggler />
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
