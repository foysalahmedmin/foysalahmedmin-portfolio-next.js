import APIIcon from "@/components/icons/api-icon";
import ExpressIcon from "@/components/icons/express-icon";
import LangChainIcon from "@/components/icons/langchain-icon";
import LangGraphIcon from "@/components/icons/langgraph-icon";
import MongoDBIcon from "@/components/icons/mongodb-icon";
import NextIcon from "@/components/icons/next-icon";
import NodeIcon from "@/components/icons/node-icon";
import ReactIcon from "@/components/icons/react-icon";
import ReduxIcon from "@/components/icons/redux-icon";
import SQLIcon from "@/components/icons/sql-icon";
import TailwindIcon from "@/components/icons/tailwind-icon";
import TSIcon from "@/components/icons/ts-icon";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";
import React from "react";

const skills = [
  {
    name: "TypeScript",
    icon: <TSIcon className="size-12 text-[#3178c6]" />,
    level: 85,
  },
  {
    name: "Tailwind CSS",
    icon: <TailwindIcon className="size-12 text-[#06B6D4]" />,
    level: 98,
  },
  {
    name: "Redux",
    icon: <ReduxIcon className="size-12 text-[#764ABC]" />,
    level: 88,
  },
  {
    name: "React",
    icon: <ReactIcon className="size-12 text-[#61dafb]" />,
    level: 95,
  },
  {
    name: "Next.js",
    icon: <NextIcon className="size-12 text-[#000000]" />,
    level: 92,
  },
  {
    name: "Node.js",
    icon: <NodeIcon className="size-12 text-[#339933]" />,
    level: 90,
  },
  {
    name: "Express.js",
    icon: <ExpressIcon className="size-12 text-[#000000]" />,
    level: 90,
  },
  {
    name: "LangChain",
    icon: <LangChainIcon className="size-12 text-[#1C3C3C]" />,
    level: 80,
  },
  {
    name: "LangGraph",
    icon: <LangGraphIcon className="size-12 text-[#1C3C3C]" />,
    level: 75,
  },
  {
    name: "SQL",
    icon: <SQLIcon className="size-12 text-[#4479A1]" />,
    level: 85,
  },
  {
    name: "MongoDB",
    icon: <MongoDBIcon className="size-12 text-[#47A248]" />,
    level: 80,
  },
  {
    name: "REST API",
    icon: <APIIcon className="size-12 text-[#000000]" />,
    level: 92,
  },
];

const SkillsSection: React.FC = () => {
  return (
    <section id="skills" className="overflow-hidden py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <SectionTitle>
          <Subtitle>Expertise</Subtitle>
          <Title>My Skills & Tools</Title>
        </SectionTitle>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-8">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="fade-up group perspective-1000 relative aspect-square w-full"
              style={
                { transitionDelay: `${index * 100}ms` } as React.CSSProperties
              }
              tabIndex={0}
            >
              <div className="relative h-full w-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus:[transform:rotateY(180deg)]">
                {/* Front Side */}
                <div className="border-border bg-card absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-6 shadow-sm [backface-visibility:hidden]">
                  <div className="mb-4 transition-transform duration-300 group-hover:scale-110">
                    {skill.icon}
                  </div>
                  <h3 className="text-center text-sm font-bold tracking-tight uppercase lg:text-base">
                    {skill.name}
                  </h3>
                </div>

                {/* Back Side */}
                <div className="border-primary/50 bg-card absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center rounded-2xl border p-6 shadow-sm [backface-visibility:hidden]">
                  <div className="text-primary mb-2 text-3xl font-bold">
                    {skill.level}%
                  </div>
                  <h3 className="text-muted-foreground mb-3 text-center text-xs font-semibold tracking-tight uppercase lg:text-sm">
                    {skill.name}
                  </h3>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full w-0 rounded-full transition-all duration-1000 ease-out group-hover:w-[var(--skill-level)] group-focus:w-[var(--skill-level)]"
                      style={
                        {
                          "--skill-level": `${skill.level}%`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Marquee effect for tools */}
        <div className="mt-20">
          <p className="text-muted-foreground fade-up mb-8 text-center text-sm font-medium tracking-widest uppercase delay-300">
            Others tools I use
          </p>
          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
            <div className="flex w-max gap-8">
              {[0, 1].map((i) => (
                <div key={i} className="animate-marquee flex shrink-0 gap-8">
                  {[
                    "VS Code",
                    "Postman",
                    "Git / GitHub",
                    "Vercel",
                    "Docker",
                    "Figma",
                    "Notion",
                    "Slack",
                    "Trello",
                    "Jira",
                  ].map((tool, idx) => (
                    <div
                      key={idx}
                      className="border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/20 flex items-center gap-2 rounded-lg border px-6 py-3 transition-colors"
                    >
                      <span className="text-base font-bold whitespace-nowrap">
                        {tool}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
