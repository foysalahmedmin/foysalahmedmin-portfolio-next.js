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

const EducationSection = () => {
  return (
    <section className="bg-muted/10 py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <span className="fade-left text-primary mb-3 inline-block text-sm font-bold tracking-widest uppercase">
            Learning
          </span>
          <h2 className="fade-up text-3xl font-bold tracking-tight delay-100 md:text-5xl">
            Education History
          </h2>
        </div>
        <div className="border-primary/20 grid grid-cols-1 gap-8 border-l-2 pl-8">
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
              <p className="text-muted-foreground mt-4 max-w-3xl leading-relaxed">
                {edu.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EducationSection;
