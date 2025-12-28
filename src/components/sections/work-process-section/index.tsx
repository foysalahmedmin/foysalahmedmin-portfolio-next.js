"use client";

import { Icon } from "@/components/ui/icon";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";

const steps = [
  {
    icon: "search",
    title: "Discovery",
    description: "Understanding your goals, target audience, and requirements.",
  },
  {
    icon: "map",
    title: "Planning",
    description:
      "Creating a roadmap, sitemap, and selecting the right tech stack.",
  },
  {
    icon: "palette",
    title: "Design",
    description: "Crafting intuitive and visually appealing user interfaces.",
  },
  {
    icon: "code-2",
    title: "Development",
    description: "Writing clean, scalable, and efficient code.",
  },
  {
    icon: "bug",
    title: "Testing",
    description: " ensuring bug-free performance across all devices.",
  },
  {
    icon: "rocket",
    title: "Launch",
    description: "Deploying the project and providing post-launch support.",
  },
];

const WorkProcessSection = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <SectionTitle>
          <Subtitle>Workflow</Subtitle>
          <Title>My Work Process</Title>
        </SectionTitle>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="fade-up group bg-card hover:border-primary/20 border-border/50 relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Step Number Background */}
              <div className="text-secondary/5 group-hover:text-primary/5 absolute -top-6 -right-6 text-9xl font-black transition-transform duration-500 group-hover:scale-105">
                {i + 1}
              </div>

              <div className="relative z-10">
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-6 flex size-14 items-center justify-center rounded-xl transition-colors duration-300">
                  <Icon name={step.icon} className="size-7" />
                </div>

                <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkProcessSection;
