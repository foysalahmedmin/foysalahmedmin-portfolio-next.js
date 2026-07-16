"use client";

import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { Button, buttonVariants } from "@/components/ui/button";
import OptimizedMedia from "@/components/ui/optimized-media";
import { useDialogFocus } from "@/hooks/ui/use-dialog-focus";
import { useScrollPosition } from "@/hooks/ui/use-scroll-position";
import {
  getPrimaryPublicCta,
  getPublicShellLinks,
  type TPublicShellLink,
} from "@/lib/site/public-shell";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/setting-slice";
import { ArrowUpRight, Menu, Monitor, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type HeaderProps = {
  site: TPublicSiteDto;
  className?: string;
};

const isActivePath = (pathname: string, href: string): boolean =>
  href === "/"
    ? pathname === "/"
    : pathname.startsWith(`${href}/`) || pathname === href;

const PublicLink = ({
  link,
  className,
  onClick,
  children,
}: {
  link: TPublicShellLink;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  if (link.external) {
    return (
      <a
        href={link.href}
        className={className}
        onClick={onClick}
        target={link.href.startsWith("https:") ? "_blank" : undefined}
        rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
      >
        {children ?? link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} onClick={onClick}>
      {children ?? link.label}
    </Link>
  );
};

const ThemeToggle = () => {
  const { theme } = useAppSelector((state) => state.setting);
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const icon = !mounted ? (
    <Monitor className="size-5" aria-hidden="true" />
  ) : theme === "dark" ? (
    <Sun className="size-5" aria-hidden="true" />
  ) : theme === "light" ? (
    <Moon className="size-5" aria-hidden="true" />
  ) : (
    <Monitor className="size-5" aria-hidden="true" />
  );

  return (
    <Button
      type="button"
      variant="ghost"
      shape="icon"
      onClick={() => dispatch(toggleTheme())}
      aria-label="Change color theme"
    >
      {icon}
    </Button>
  );
};

const Brand = ({ site }: { site: TPublicSiteDto }) => {
  const name =
    site.identity.short_name ||
    site.identity.public_name ||
    "Engineering Portfolio";
  const tagline =
    site.positioning.mobile ||
    site.positioning.compact ||
    "Product engineering";
  const logo = site.brand.logo_dark ?? site.brand.logo_light;

  return (
    <Link
      href="/"
      className="focus-visible:ring-primary flex min-h-11 min-w-0 items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      aria-label={`${name} home`}
    >
      <span className="border-border bg-surface-subtle relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border">
        {logo ? (
          <OptimizedMedia
            src={logo.url}
            alt=""
            fallback="profile"
            sizes="44px"
            className="object-contain p-1"
          />
        ) : (
          <span className="text-primary text-sm font-black" aria-hidden="true">
            {name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
      </span>
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block truncate text-sm font-black tracking-wide uppercase">
          {name}
        </span>
        <span className="text-muted-foreground block max-w-48 truncate text-[0.68rem] font-semibold">
          {tagline}
        </span>
      </span>
    </Link>
  );
};

const MobileNavigation = ({
  open,
  links,
  site,
  onClose,
}: {
  open: boolean;
  links: readonly TPublicShellLink[];
  site: TPublicSiteDto;
  onClose: () => void;
}) => {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ active: open, containerRef: dialogRef, onEscape: onClose });

  return (
    <div
      ref={dialogRef}
      id="public-mobile-navigation"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-mobile-navigation-title"
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      className={cn(
        "bg-background/95 fixed inset-0 z-[calc(var(--z-header)+1)] overflow-y-auto px-6 py-6 backdrop-blur-2xl transition-[opacity,visibility] duration-[var(--motion-standard)] motion-reduce:transition-none xl:hidden",
        open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
      )}
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col">
        <div className="flex items-center justify-between gap-5">
          <p
            id="public-mobile-navigation-title"
            className="text-sm font-black tracking-[0.18em] uppercase"
          >
            Navigation
          </p>
          <Button
            type="button"
            variant="outline"
            shape="icon"
            data-initial-focus
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <nav className="my-auto py-12" aria-label="Mobile primary navigation">
          <ul className="space-y-2" role="list">
            {links.map((link, index) => {
              const active =
                !link.external && isActivePath(pathname, link.href);
              return (
                <li key={link.key}>
                  <PublicLink
                    link={link}
                    onClick={onClose}
                    className={cn(
                      "focus-visible:ring-primary group flex min-h-16 items-center justify-between rounded-2xl px-4 text-2xl font-black tracking-tight focus-visible:ring-2 focus-visible:outline-none sm:text-3xl",
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </span>
                    {link.external && (
                      <ArrowUpRight className="size-5" aria-hidden="true" />
                    )}
                  </PublicLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="text-muted-foreground border-border border-t pt-6 text-sm leading-6">
          {site.positioning.canonical ||
            "Frontend · Backend · AI Automation · System Design · Full-Stack"}
        </p>
      </div>
    </div>
  );
};

const Header = ({ site, className }: HeaderProps) => {
  const pathname = usePathname();
  const { scrollTop, scrollDirection } = useScrollPosition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = getPublicShellLinks(site, "header");
  const cta = getPrimaryPublicCta(site);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => closeMobile(), [closeMobile, pathname]);

  return (
    <>
      <header
        className={cn(
          "bg-background/85 text-foreground sticky top-0 z-[var(--z-header)] h-20 border-b backdrop-blur-xl transition-[background-color,box-shadow,transform,border-color] duration-[var(--motion-standard)] motion-reduce:transform-none motion-reduce:transition-none",
          scrollTop > 24 ? "border-border shadow-sm" : "border-transparent",
          scrollDirection === "down" && scrollTop > 160 && !mobileOpen
            ? "-translate-y-full"
            : "translate-y-0",
          className
        )}
      >
        <div className="container mx-auto flex h-full items-center justify-between gap-4 px-6">
          <Brand site={site} />
          {links.length > 0 && (
            <nav
              className="hidden min-w-0 items-center justify-center xl:flex"
              aria-label="Primary navigation"
            >
              <ul className="flex items-center gap-1" role="list">
                {links.map((link) => {
                  const active =
                    !link.external && isActivePath(pathname, link.href);
                  return (
                    <li key={link.key}>
                      <PublicLink
                        link={link}
                        className={cn(
                          "focus-visible:ring-primary relative flex min-h-11 items-center rounded-xl px-3 text-xs font-bold tracking-[0.12em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none",
                          active
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {link.label}
                        {active && (
                          <span className="bg-primary absolute right-3 bottom-1 left-3 h-0.5 rounded-full" />
                        )}
                      </PublicLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {cta && (
              <PublicLink
                link={cta}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden 2xl:inline-flex"
                )}
              >
                {cta.label}
                {cta.external && (
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                )}
              </PublicLink>
            )}
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              shape="icon"
              className="xl:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>
      <MobileNavigation
        open={mobileOpen}
        links={links}
        site={site}
        onClose={closeMobile}
      />
    </>
  );
};

export default Header;
