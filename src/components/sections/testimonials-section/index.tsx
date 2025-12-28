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
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      <div className="bg-primary/5 absolute inset-0 -skew-y-3 transform" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="mb-16 text-center">
          <span className="fade-left text-primary mb-3 inline-block text-sm font-bold tracking-widest uppercase">
            Success Stories
          </span>
          <h2 className="fade-up text-3xl font-bold tracking-tight delay-100 md:text-5xl">
            Testimonials
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="fade-up bg-card border-border relative rounded-2xl border p-8 shadow-sm transition-all hover:shadow-md"
              style={
                { transitionDelay: `${index * 200}ms` } as React.CSSProperties
              }
            >
              <Quote className="text-primary/20 absolute top-6 right-6 size-12" />
              <p className="text-muted-foreground relative z-10 mb-8 leading-relaxed italic">
                "{testimonial.content}"
              </p>
              <div>
                <h4 className="text-foreground font-bold">
                  {testimonial.name}
                </h4>
                <p className="text-primary text-sm">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
