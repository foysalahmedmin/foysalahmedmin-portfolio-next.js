"use client";

import { useIntersectionObserver } from "@/hooks/observers/use-intersection-observer";
import { useCountUp } from "@/hooks/utils/use-count-up";
import React, { useState } from "react";

interface StatItemProps {
  value: number;
  label: string;
  suffix?: string;
  isVisible: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ value, label, suffix = "", isVisible }) => {
  const count = useCountUp(isVisible ? value : 0, 2000);

  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center lg:p-10">
      <div className="flex items-baseline text-4xl font-bold tracking-tighter sm:text-5xl lg:text-6xl text-foreground">
        <span>{count}</span>
        {suffix && <span className="text-primary ml-1">{suffix}</span>}
      </div>
      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
};

const StatisticsSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  const { setRef } = useIntersectionObserver({
    classNames: "active",
    options: { threshold: 0.2 },
    isUnobservable: true,
    callback: (active) => {
        if (active) setIsVisible(true);
    }
  });

  const stats = [
    { value: 5, label: "Years Experience", suffix: "+" },
    { value: 50, label: "Projects Completed", suffix: "+" },
    { value: 20, label: "Happy Clients", suffix: "+" },
    { value: 15, label: "Technologies Mastered", suffix: "" },
  ];

  return (
    <section 
        ref={setRef(0)} 
        id="statistics" 
        className="bg-muted/30 border-y border-border py-12 lg:py-20"
    >
      <div className="container px-6 mx-auto">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {stats.map((stat, index) => (
            <StatItem 
                key={index} 
                value={stat.value} 
                label={stat.label} 
                suffix={stat.suffix} 
                isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
