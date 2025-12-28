import { Icon } from "@/components/ui/icon";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";

const ExperienceData = [
  {
    role: "Full Stack Developer",
    company: "Shothik AI",
    period: "Oct 2025 - Present",
    description:
      "Designing and implementing scalable, high-performance web applications and AI-driven solutions. Collaborate with cross-functional teams to deliver robust backend services and intuitive frontend interfaces.",
  },
  {
    role: "Junior Full Stack Engineer",
    company: "FIFOTech",
    period: "Mar 2025 - Oct 2025",
    description:
      "Assisted in developing full-stack web applications, optimizing backend APIs, and creating responsive UI components using React and Next.js. Contributed to code reviews and implemented best practices.",
  },
  {
    role: "Frontend Engineer",
    company: "FIFOTech",
    period: "Aug 2023 - Mar 2025",
    description:
      "Developed responsive, user-friendly web interfaces using React, Next.js, and Tailwind CSS. Focused on performance optimization, accessibility, and improving user experience across web platforms.",
  },
  {
    role: "Executive (Territory Sales Offices)",
    company: "Carnival Internet",
    period: "Feb 2022 - May 2023",
    description:
      "Managed territory sales operations, built strong client relationships, and drove business growth by identifying opportunities and delivering tailored solutions. Ensured customer satisfaction and supported team objectives.",
  },
];

const ExperienceSection = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <SectionTitle>
          <Subtitle>Timeline</Subtitle>
          <Title>Professional Experience</Title>
        </SectionTitle>
        <div className="border-primary/20 relative ml-4 space-y-12 border-l-2 pl-8 md:ml-0">
          {ExperienceData.map((exp, i) => (
            <div
              key={i}
              className="fade-left group relative"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Timeline Dot/Icon */}
              <div className="border-background bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground absolute top-0 -left-[49px] flex size-10 items-center justify-center rounded-full border-4 shadow-sm transition-all duration-300 group-hover:scale-110">
                <Icon name="briefcase" className="size-4" />
              </div>

              {/* Card Content */}
              <div className="bg-card hover:bg-accent/5 border-border/50 hover:border-primary/20 rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xl font-bold transition-colors md:text-2xl">
                      {exp.role}
                    </h3>
                    <div className="text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                      <Icon name="building-2" className="size-4" />
                      <span>{exp.company}</span>
                    </div>
                  </div>
                  <span className="bg-primary/10 text-primary self-start rounded-full px-4 py-1.5 text-xs font-bold tracking-wider whitespace-nowrap uppercase sm:self-center">
                    {exp.period}
                  </span>
                </div>

                <p className="text-muted-foreground text-base leading-relaxed">
                  {exp.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
