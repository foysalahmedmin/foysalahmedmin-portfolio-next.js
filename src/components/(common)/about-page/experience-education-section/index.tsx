import { Briefcase, GraduationCap } from "lucide-react";

const ExperienceData = [
  {
    role: "Full Stack Developer",
    company: "Freelance",
    period: "2023 - Present",
    description:
      "Developing custom web applications using Next.js, Node.js, and MongoDB for various clients.",
  },
  {
    role: "Web Development Learner",
    company: "Self-Employed",
    period: "2022 - 2023",
    description:
      "Deep-dived into JavaScript ecosystem, mastering React and backend development concepts.",
  },
];

const EducationData = [
  {
    degree: "Diploma in Engineering",
    institution: "Your Polytechnic Institute",
    period: "2019 - 2023",
    description: "Focused on Computer Science and Technology foundations.",
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
