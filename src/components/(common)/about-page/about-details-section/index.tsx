import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Link from "next/link";

const AboutDetailsSection = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="fade-left">
            <img
              src="/images/profile.png"
              alt="Foysal Ahmed"
              className="rounded-2xl shadow-2xl grayscale transition-all duration-700 hover:grayscale-0"
            />
          </div>
          <div className="fade-right space-y-8">
            <h2 className="text-3xl font-bold md:text-4xl">
              I Design and Build Intelligent Systems as a Full-Stack Developer &
              System Architect
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              I am a{" "}
              <span className="text-primary font-bold">
                Full-Stack Developer & System Architect
              </span>{" "}
              with expertise in designing, developing, and scaling complex
              systems across web, mobile, and backend platforms. I specialize in
              architecting robust solutions based on project requirements and
              business logic, ensuring that every system is efficient,
              maintainable, and future-proof. My experience spans building
              responsive applications, managing SQL and NoSQL databases,
              implementing automated workflows, integrating AI-driven solutions,
              and optimizing user experiences. I focus on delivering
              high-quality, end-to-end solutions that empower businesses and
              provide seamless experiences for users.
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
            <Link
              href="https://drive.google.com/file/d/1BUDGgWeCHh-p7gSUPGDGzGRMUrfWpHAe/view?usp=sharing"
              target="_blank"
            >
              <Button size="lg" variant="outline">
                Download CV
                <Download className="ml-2 size-4 transition-transform group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutDetailsSection;
