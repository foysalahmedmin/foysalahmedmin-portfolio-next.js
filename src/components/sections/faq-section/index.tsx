"use client";

import { Icon } from "@/components/ui/icon";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import { useState } from "react";

const faqs = [
  {
    question: "Do you work with international clients?",
    answer:
      "Yes! I have experience working with clients from all over the world. I am comfortable communicating in English and can adjust to different time zones for meetings and updates.",
  },
  {
    question: "What are your payment terms?",
    answer:
      "For fixed-price projects, I typically require a 50% deposit upfront, with the remaining 50% due upon project completion. For hourly work, I invoice weekly or bi-weekly. I accept payments via Bank Transfer, Payoneer, or Wise.",
  },
  {
    question: "Do you offer fixed-price projects?",
    answer:
      "Absolutely. If the project scope is well-defined, I prefer fixed-price contracts as it gives both parties clarity on the budget. For ongoing or undefined work, an hourly model works best.",
  },
  {
    question: "What happens if I need changes after the project is done?",
    answer:
      "I provide 1 month of free support after launch for any bugs or minor tweaks. For new features or significant changes, we can discuss a separate maintenance contract or hourly arrangement.",
  },
  {
    question: "Can you help me design the website too?",
    answer:
      "Yes, I have a strong background in UI/UX design. I can create high-fidelity mockups in Figma before moving to development to ensure the final product matches your vision.",
  },
];

const FaqItem = ({
  item,
  isOpen,
  onClick,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={cn(
        "bg-card border-border/50 overflow-hidden rounded-2xl border transition-all duration-300",
        isOpen ? "border-primary/50 shadow-md" : "hover:border-primary/20"
      )}
    >
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between p-6 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-bold">{item.question}</span>
        <span
          className={cn(
            "bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
            isOpen && "bg-primary text-primary-foreground rotate-180"
          )}
        >
          <Icon name="chevron-down" className="size-5" />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="text-muted-foreground px-6 pb-6 leading-relaxed">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
};

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto max-w-4xl px-6">
        <SectionTitle>
          <Subtitle>Common Questions</Subtitle>
          <Title>Frequently Asked Questions</Title>
        </SectionTitle>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="fade-up"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <FaqItem
                item={faq}
                isOpen={openIndex === i}
                onClick={() => handleToggle(i)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
