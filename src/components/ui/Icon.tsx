"use client";

import * as icons from "lucide-react";
import React from "react";

type ValidIconProps = Omit<React.SVGProps<SVGSVGElement>, "ref">;
type IconKeys = {
  [K in keyof typeof icons]: (typeof icons)[K] extends React.ComponentType<ValidIconProps>
    ? K
    : never;
}[keyof typeof icons];

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconKeys;
}

const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = icons[name];
  return <LucideIcon {...props} />;
};

export default Icon;
