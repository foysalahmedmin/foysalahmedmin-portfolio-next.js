"use client";

import * as icons from "lucide-react";
import React from "react";

type ValidIconProps = Omit<React.SVGProps<SVGSVGElement>, "ref">;

// Extract only valid icon keys
type IconKeys = {
  [K in keyof typeof icons]: (typeof icons)[K] extends React.ComponentType<ValidIconProps>
    ? K
    : never;
}[keyof typeof icons];

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconKeys | string;
}

function toPascalCase(input: string): string {
  return input
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

const Icon = ({ name, ...props }: IconProps) => {
  const iconKeyName = toPascalCase(name) as keyof typeof icons;

  if (!(iconKeyName in icons)) {
    console.warn(`[Icon] Invalid icon name: "${name}"`);
    return null;
  }

  const LucideIcon = icons[iconKeyName] as React.FC<ValidIconProps>;

  return <LucideIcon {...props} />;
};

export default Icon;
