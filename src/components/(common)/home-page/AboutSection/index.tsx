import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const stats = [
  { number: "1+", label: "Year Experience" },
  { number: "15+", label: "Projects Completed" },
  { number: "100%", label: "Passion for Coding" },
];

const AboutSection: React.FC = () => {
  return (
    <section className={cn("bg-background text-foreground py-24")}>
      <div className="container flex w-full items-center">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text Section */}
          <div className="order-2 space-y-6 lg:order-1">
            <span className="text-primary inline-block text-sm font-medium tracking-wider uppercase">
              About Me
            </span>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Node.js Developer & Passionate Learner
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              Hi, I’m <strong>Foysal Ahmed</strong>, a dedicated web developer
              with a strong focus on building scalable, high-quality
              applications using
              <span className="text-primary"> Node.js</span>,
              <span className="text-primary"> React</span>, and modern
              JavaScript technologies. With a growing skill set in backend and
              frontend development, I’m constantly exploring new technologies
              and best practices to deliver exceptional solutions.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              I believe in writing clean, maintainable code, following
              <strong> conventional naming practices</strong>, and creating
              efficient, user-friendly applications. My journey includes
              contributing to multiple projects and continuously improving my
              skills to become a versatile full-stack developer.
            </p>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <div key={index}>
                  <h3 className="text-primary mb-2 text-2xl font-bold lg:text-4xl">
                    {stat.number}
                  </h3>
                  <p className="text-muted-foreground text-xs lg:text-sm">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="mt-10 flex items-center gap-4">
              <Link href="/about">
                <Button>
                  <span>Read More</span>
                </Button>
              </Link>
              <Link href="#contact">
                <Button variant="outline">
                  <span>Get in Touch</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Profile Image Card */}
          <div className="order-1 lg:order-2">
            <div className="group relative">
              <div className="bg-muted/50 aspect-[3/4] overflow-hidden rounded-lg shadow-lg">
                <img
                  src="/images/profile.png"
                  alt="Portrait of Foysal Ahmed"
                  className="size-full object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="bg-card border-muted/30 relative mx-6 -mt-20 rounded-lg border p-6 shadow-lg">
                <p className="text-foreground text-sm font-medium italic">
                  "Coding is not just my profession—it's my passion. I aim to
                  craft solutions that are both functional and elegant."
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  — Foysal Ahmed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
