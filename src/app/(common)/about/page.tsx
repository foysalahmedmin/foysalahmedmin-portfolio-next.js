import PageHeaderSection from "@/components/sections/page-header-section";
import ServicesSection from "@/components/sections/services-section";
import SkillsSection from "@/components/sections/skills-section";
import StatisticsSection from "@/components/sections/statistics-section";
import TestimonialsSection from "@/components/sections/testimonials-section";
import { Button } from "@/components/ui/button";
import { BookOpen, Briefcase, Download, GraduationCap } from "lucide-react";

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

const CoursesData = [
  {
    title: "Next.js Mastery",
    provider: "Programming Hero",
    year: "2024",
  },
];

const AboutPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "About", href: "/about" },
  ];

  return (
    <main className="min-h-screen">
      <PageHeaderSection
        title="About Me"
        description="Dedicated web developer with a passion for building scalable applications and solving complex problems."
        breadcrumbItems={breadcrumbItems}
      />

      {/* About Details */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            <div className="fade-left">
              <img
                src="/images/profile-large.png"
                alt="Foysal Ahmed"
                className="rounded-2xl shadow-2xl grayscale transition-all duration-700 hover:grayscale-0"
              />
            </div>
            <div className="fade-right space-y-8">
              <h2 className="text-3xl font-bold md:text-4xl">
                I am a passionate Full-stack Developer based in Bangladesh.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                I specialize in building modular, high-performance web
                applications using the MERN stack. My focus is on writing clean,
                maintainable code and providing the best user experience
                possible.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-foreground font-bold">Name:</p>
                  <p className="text-muted-foreground">Foysal Ahmed</p>
                </div>
                <div>
                  <p className="text-foreground font-bold">Email:</p>
                  <p className="text-muted-foreground">
                    foysalahmedmin@gmail.com
                  </p>
                </div>
                <div>
                  <p className="text-foreground font-bold">Location:</p>
                  <p className="text-muted-foreground">Dhaka, Bangladesh</p>
                </div>
                <div>
                  <p className="text-foreground font-bold">Freelance:</p>
                  <p className="text-muted-foreground">Available</p>
                </div>
              </div>
              <Button size="lg" className="group">
                Download CV{" "}
                <Download className="ml-2 size-4 transition-transform group-hover:-translate-y-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ServicesSection />

      <StatisticsSection />

      <div className="bg-muted/20">
        <SkillsSection />
      </div>

      {/* Experience & Education */}
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

      {/* Courses */}
      <section className="bg-card py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="mb-16 flex items-center gap-4">
            <BookOpen className="text-primary size-8" />
            <h2 className="text-3xl font-bold">Courses & Certifications</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CoursesData.map((course, i) => (
              <div
                key={i}
                className="fade-up group border-border bg-background hover:border-primary flex flex-col justify-between rounded-xl border p-6 transition-all"
              >
                <div>
                  <h3 className="group-hover:text-primary text-lg font-bold transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {course.provider}
                  </p>
                </div>
                <span className="text-primary mt-4 text-sm font-bold">
                  {course.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />
    </main>
  );
};

export default AboutPage;
