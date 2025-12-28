import { Icon } from "@/components/ui/icon";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import React from "react";

const SERVICES = [
  {
    icon: "code-2",
    title: "Full-Stack Development",
    description:
      "Building scalable, high-performance web applications using modern stacks like MERN and Next.js. Focus on clean code and robust features.",
  },
  {
    icon: "layers",
    title: "System Architecture",
    description:
      "Designing complex system infrastructures that are scalable, secure, and optimized for high-traffic environments and modern cloud ecosystems.",
  },
  {
    icon: "sparkles",
    title: "AI & Automation",
    description:
      "Integrating cutting-edge AI models and automating repetitive workflows to enhance efficiency and create intelligent user experiences.",
  },
  {
    icon: "smartphone",
    title: "App Development",
    description:
      "Crafting seamless cross-platform mobile applications that provide native-like performance and intuitive interfaces for iOS and Android.",
  },
];

const ServicesSection: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <section className={cn("py-24 lg:py-32", className)}>
      <div className="container mx-auto px-6">
        <SectionTitle className="lg:mb-24">
          <Subtitle className="animate-in fade-in slide-in-from-bottom-2 mb-3 inline-block text-sm font-bold tracking-widest uppercase duration-500">
            What I Do
          </Subtitle>
          <Title className="animate-in fade-in slide-in-from-bottom-4 text-3xl font-bold tracking-tight duration-700 md:text-5xl lg:text-6xl">
            My Specialized <span className="text-primary">Services</span>
          </Title>
          <Description className="text-muted-foreground animate-in fade-in slide-in-from-bottom-6 mx-auto mt-6 max-w-2xl text-lg duration-1000">
            I provide comprehensive technical solutions that bridge the gap
            between complex backend logic and intuitive user experiences.
          </Description>
        </SectionTitle>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, i) => (
            <div
              key={i}
              className="group glass-card border-border hover:border-primary hover:shadow-primary/10 relative overflow-hidden rounded-3xl border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-8 flex size-16 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                <Icon name={service.icon} className="size-8" />
              </div>

              <h3 className="group-hover:text-primary mb-4 text-xl font-bold tracking-tight transition-colors">
                {service.title}
              </h3>
              <p className="text-muted-foreground group-hover:text-foreground/80 text-sm leading-relaxed transition-colors">
                {service.description}
              </p>

              {/* Decorative background element */}
              <div className="bg-primary/5 group-hover:bg-primary/10 absolute -right-8 -bottom-8 -z-10 size-32 rounded-full blur-3xl transition-all duration-500 group-hover:scale-150" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
