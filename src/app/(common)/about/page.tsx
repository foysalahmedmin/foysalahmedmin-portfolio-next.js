import SkillsSection from "@/components/(common)/home-page/skills-section";
import StatisticsSection from "@/components/(common)/home-page/statistics-section";
import TestimonialsSection from "@/components/(common)/home-page/testimonials-section";
import { Button } from "@/components/ui/button";
import { BookOpen, Briefcase, Download, GraduationCap } from "lucide-react";

const ExperienceData = [
  {
    role: "Full Stack Developer",
    company: "Freelance",
    period: "2023 - Present",
    description: "Developing custom web applications using Next.js, Node.js, and MongoDB for various clients.",
  },
  {
    role: "Web Development Learner",
    company: "Self-Employed",
    period: "2022 - 2023",
    description: "Deep-dived into JavaScript ecosystem, mastering React and backend development concepts.",
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
  return (
    <main className="pt-16">
      {/* Page Header */}
      <section className="bg-muted/30 py-20 lg:py-32">
        <div className="container px-6 mx-auto text-center">
          <h1 className="fade-down text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            About <span className="text-primary">Me</span>
          </h1>
          <p className="fade-up mt-6 max-w-2xl mx-auto text-muted-foreground text-lg">
            Dedicated web developer with a passion for building scalable applications and solving complex problems.
          </p>
        </div>
      </section>

      {/* About Details */}
      <section className="py-24 lg:py-32">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            <div className="fade-left">
               <img src="/images/profile-large.png" alt="Foysal Ahmed" className="rounded-2xl shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" />
            </div>
            <div className="fade-right space-y-8">
              <h2 className="text-3xl font-bold md:text-4xl">I am a passionate Full-stack Developer based in Bangladesh.</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                I specialize in building modular, high-performance web applications using the MERN stack. My focus is on writing clean, maintainable code and providing the best user experience possible.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold text-foreground">Name:</p>
                  <p className="text-muted-foreground">Foysal Ahmed</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Email:</p>
                  <p className="text-muted-foreground">foysalahmedmin@gmail.com</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Location:</p>
                  <p className="text-muted-foreground">Dhaka, Bangladesh</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Freelance:</p>
                  <p className="text-muted-foreground">Available</p>
                </div>
              </div>
              <Button size="lg" className="group">
                Download CV <Download className="ml-2 size-4 transition-transform group-hover:-translate-y-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <StatisticsSection />
      
      <div className="bg-muted/20">
        <SkillsSection />
      </div>

      {/* Experience & Education */}
      <section className="py-24 lg:py-32">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            {/* Experience */}
            <div className="space-y-12">
              <div className="flex items-center gap-4">
                <Briefcase className="text-primary size-8" />
                <h2 className="text-3xl font-bold">Experience</h2>
              </div>
              <div className="space-y-8 border-l-2 border-primary/20 pl-8">
                {ExperienceData.map((exp, i) => (
                  <div key={i} className="fade-left relative" style={{ animationDelay: `${i * 0.2}s` }}>
                    <div className="bg-primary absolute -left-[41px] top-2 size-4 rounded-full border-4 border-background" />
                    <span className="text-primary text-sm font-bold uppercase">{exp.period}</span>
                    <h3 className="mt-2 text-xl font-bold">{exp.role}</h3>
                    <p className="text-muted-foreground font-medium">{exp.company}</p>
                    <p className="mt-4 text-muted-foreground leading-relaxed">{exp.description}</p>
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
              <div className="space-y-8 border-l-2 border-primary/20 pl-8">
                {EducationData.map((edu, i) => (
                  <div key={i} className="fade-right relative" style={{ animationDelay: `${i * 0.2}s` }}>
                    <div className="bg-primary absolute -left-[41px] top-2 size-4 rounded-full border-4 border-background" />
                    <span className="text-primary text-sm font-bold uppercase">{edu.period}</span>
                    <h3 className="mt-2 text-xl font-bold">{edu.degree}</h3>
                    <p className="text-muted-foreground font-medium">{edu.institution}</p>
                    <p className="mt-4 text-muted-foreground leading-relaxed">{edu.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="bg-card py-24 lg:py-32">
        <div className="container px-6 mx-auto">
            <div className="mb-16 flex items-center gap-4">
                <BookOpen className="text-primary size-8" />
                <h2 className="text-3xl font-bold">Courses & Certifications</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {CoursesData.map((course, i) => (
                    <div key={i} className="fade-up group flex flex-col justify-between rounded-xl border border-border bg-background p-6 transition-all hover:border-primary">
                        <div>
                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{course.title}</h3>
                            <p className="text-muted-foreground mt-1">{course.provider}</p>
                        </div>
                        <span className="mt-4 text-sm font-bold text-primary">{course.year}</span>
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
