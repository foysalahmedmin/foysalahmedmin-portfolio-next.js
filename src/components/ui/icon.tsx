import {
  Briefcase,
  FileText,
  House,
  Layers,
  Mail,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";

// Named imports only: a namespace import ships the whole lucide set (about 150 KB gzip) to
// every page (ADR 0002, ADR 0011). Add an icon here when a data-driven name needs it.
const ICONS = {
  briefcase: Briefcase,
  "file-text": FileText,
  home: House,
  house: House,
  layers: Layers,
  mail: Mail,
  user: User,
  video: Video,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  name: IconName | (string & {});
}

const normalise = (input: string): string =>
  input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();

const Icon = ({ name, ...props }: IconProps) => {
  const key = normalise(name);
  const Component = (ICONS as Record<string, LucideIcon>)[key];

  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return null;
  }

  return <Component {...props} />;
};

export { Icon };
