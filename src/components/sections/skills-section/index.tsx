"use client";

import React from "react";

const skills = [
  { name: "Node.js", icon: "🌐", level: 90 },
  { name: "React / Next.js", icon: "⚛️", level: 95 },
  { name: "TypeScript", icon: "📘", level: 85 },
  { name: "MongoDB", icon: "🍃", level: 80 },
  { name: "Tailwind CSS", icon: "🎨", level: 98 },
  { name: "Redux", icon: "🔄", level: 88 },
  { name: "Express.js", icon: "🚀", level: 90 },
  { name: "REST API", icon: "📡", level: 92 },
];

const SkillsSection: React.FC = () => {
  return (
    <section id="skills" className="py-24 lg:py-32 overflow-hidden">
      <div className="container px-6 mx-auto">
        <div className="mb-16 text-center">
          <span className="fade-left text-primary mb-3 inline-block text-sm font-bold uppercase tracking-widest">
            Expertise
          </span>
          <h2 className="fade-up text-3xl font-bold tracking-tight md:text-5xl delay-100">
            My Skills & Tools
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-8">
          {skills.map((skill, index) => (
            <div 
              key={index} 
              className="fade-up group relative flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
              style={{ transitionDelay: `${index * 100}ms` } as React.CSSProperties}
            >
              <div className="mb-4 text-4xl transition-transform duration-300 group-hover:scale-110">
                {skill.icon}
              </div>
              <h3 className="text-sm font-bold tracking-tight uppercase lg:text-base">
                {skill.name}
              </h3>
              
              {/* Progress bar on hover */}
              <div className="absolute inset-x-0 bottom-0 h-1 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
            </div>
          ))}
        </div>

        {/* Marquee effect for tools (Optional enhancement) */}
        <div className="mt-20">
            <p className="text-muted-foreground mb-8 text-center text-sm font-medium uppercase tracking-widest fade-up delay-300">
                Others tools I use
            </p>
            <div className="flex flex-wrap justify-center gap-6 opacity-50 grayscale transition-all hover:grayscale-0 fade-up delay-400">
                {["VS Code", "Postman", "Git / GitHub", "Vercel", "Docker", "Figma"].map((tool) => (
                    <span key={tool} className="text-lg font-bold">{tool}</span>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
