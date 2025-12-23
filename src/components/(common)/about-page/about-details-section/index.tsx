import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const AboutDetailsSection = () => {
  return (
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
              maintainable code and providing the best user experience possible.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground font-bold">Name:</p>
                <p className="text-muted-foreground">Foysal Ahmed</p>
              </div>
              <div>
                <p className="text-foreground font-bold">Email:</p>
                <p className="text-muted-foreground">foysalahmedmin@gmail.com</p>
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
  );
};

export default AboutDetailsSection;
