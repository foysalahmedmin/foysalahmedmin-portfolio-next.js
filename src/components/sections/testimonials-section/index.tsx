import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNextTrigger,
  CarouselPreviousTrigger,
} from "@/components/ui/carousel";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";
import { Quote } from "lucide-react";
import React from "react";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  image?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Alex Johnson",
    role: "CEO at TechFlow",
    content:
      "Working with Foysal was a game-changer for our project. His expertise in Node.js and attention to detail ensured a smooth and high-performance backend architecture.",
  },
  {
    name: "Sarah Miller",
    role: "Product Manager",
    content:
      "Minimalist, efficient, and professional. Foysal delivered exactly what we needed within the deadline. Highly recommended for full-stack development.",
  },
  {
    name: "Michael Chen",
    role: "Full Stack Developer",
    content:
      "I've collaborated with many developers, but Foysal's commitment to clean code and conventional naming is outstanding. A true professional.",
  },
  {
    name: "Emily Davis",
    role: "Marketing Director",
    content:
      "The website redesign significantly improved our conversion rates. Foysal's understanding of UI/UX principles really shines through in his work.",
  },
  {
    name: "David Wilson",
    role: "CTO at StartupX",
    content:
      "Scalable code, great communication, and a knack for solving complex problems. Foysal is a valuable asset to any engineering team.",
  },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      <div className="bg-primary/5 absolute inset-0 -skew-y-3 transform" />

      <div className="relative z-10 container mx-auto px-6">
        <SectionTitle>
          <Subtitle>Success Stories</Subtitle>
          <Title>Testimonials</Title>
        </SectionTitle>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4 pb-4">
            {testimonials.map((testimonial, index) => (
              <CarouselItem
                key={index}
                className="pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <div className="bg-card border-border relative flex h-full flex-col rounded-2xl border p-8 shadow-sm transition-all hover:shadow-md">
                  <Quote className="text-primary/20 absolute top-6 right-6 size-12" />
                  <p className="text-muted-foreground relative z-10 mb-8 flex-grow leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <h4 className="text-foreground font-bold">
                      {testimonial.name}
                    </h4>
                    <p className="text-primary text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-8 flex justify-center gap-4">
            <CarouselPreviousTrigger
              className="static translate-x-0 translate-y-0"
              variant="outline"
            />
            <CarouselNextTrigger
              className="static translate-x-0 translate-y-0"
              variant="outline"
            />
          </div>
        </Carousel>
      </div>
    </section>
  );
};

export default TestimonialsSection;
