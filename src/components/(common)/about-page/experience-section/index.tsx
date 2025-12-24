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
        <div className="mb-16 text-center">
          <span className="fade-left text-primary mb-3 inline-block text-sm font-bold tracking-widest uppercase">
            Timeline
          </span>
          <h2 className="fade-up text-3xl font-bold tracking-tight delay-100 md:text-5xl">
            Professional Experience
          </h2>
        </div>
        <div className="border-primary/20 grid grid-cols-1 gap-8 border-l-2 pl-8">
          {ExperienceData.map((exp, i) => (
            <div
              key={i}
              className="fade-left relative"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className="bg-primary border-background absolute top-2 -left-[41px] size-4 rounded-full border-4" />
              <span className="text-primary text-sm font-bold uppercase">
                {exp.period}
              </span>
              <h3 className="mt-2 text-xl font-bold">{exp.role}</h3>
              <p className="text-muted-foreground font-medium">{exp.company}</p>
              <p className="text-muted-foreground mt-4 max-w-3xl leading-relaxed">
                {exp.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
