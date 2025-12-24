import { Briefcase, GraduationCap } from "lucide-react";

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

const ExperienceEducationSection = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Experience */}
          <div className="space-y-12">
            <div className="flex items-center gap-4">
              <Briefcase className="text-primary size-8" />
              <h2 className="text-3xl font-bold">Experience</h2>
            </div>
            <div className="border-primary/20 space-y-8 border-l-2 pl-8">
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
                  <p className="text-muted-foreground font-medium">
                    {exp.company}
                  </p>
                  <p className="text-muted-foreground mt-4 leading-relaxed">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="space-y-12">
            <div className="flex items-center gap-4">
              <GraduationCap className="text-primary size-8" />
              <h2 className="text-3xl font-bold">Education</h2>
            </div>
            <div className="border-primary/20 space-y-8 border-l-2 pl-8">
              {EducationData.map((edu, i) => (
                <div
                  key={i}
                  className="fade-right relative"
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  <div className="bg-primary border-background absolute top-2 -left-[41px] size-4 rounded-full border-4" />
                  <span className="text-primary text-sm font-bold uppercase">
                    {edu.period}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">{edu.degree}</h3>
                  <p className="text-muted-foreground font-medium">
                    {edu.institution}
                  </p>
                  <p className="text-muted-foreground mt-4 leading-relaxed">
                    {edu.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceEducationSection;
