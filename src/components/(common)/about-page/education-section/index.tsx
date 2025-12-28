import { Icon } from "@/components/ui/icon";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";

const EducationData = [
  {
    degree: "Bachelor of Arts (BA)",
    institution: "Demra University College",
    period: "2019 - 2023",
    description:
      "Focused on Humanities and Humanistic Studies, developing critical thinking, communication, and analytical skills. Explored literature, philosophy, and social sciences to understand human behavior and society.",
  },
  {
    degree: "Higher Secondary School Certificate (HSC)",
    institution: "City International School & College",
    period: "2016 - 2018",
    description:
      "Completed Higher Secondary education with a concentration in Humanities. Studied history, sociology, and literature, laying the foundation for strong analytical and research skills.",
  },
];

const EducationSection = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <SectionTitle>
          <Subtitle>Learning</Subtitle>
          <Title>Education History</Title>
        </SectionTitle>
        <div className="border-primary/20 relative ml-4 space-y-12 border-l-2 pl-8 md:ml-0">
          {EducationData.map((edu, i) => (
            <div
              key={i}
              className="fade-right group relative"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Timeline Dot/Icon */}
              <div className="border-background bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground absolute top-0 -left-[49px] flex size-10 items-center justify-center rounded-full border-4 shadow-sm transition-all duration-300 group-hover:scale-110">
                <Icon name="graduation-cap" className="size-4" />
              </div>

              {/* Card Content */}
              <div className="bg-card hover:bg-accent/5 border-border/50 hover:border-primary/20 rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xl font-bold transition-colors md:text-2xl">
                      {edu.degree}
                    </h3>
                    <div className="text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                      <Icon name="university" className="size-4" />
                      <span>{edu.institution}</span>
                    </div>
                  </div>
                  <span className="bg-primary/10 text-primary self-start rounded-full px-4 py-1.5 text-xs font-bold tracking-wider whitespace-nowrap uppercase sm:self-center">
                    {edu.period}
                  </span>
                </div>

                <p className="text-muted-foreground text-base leading-relaxed">
                  {edu.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EducationSection;
