import { BookOpen } from "lucide-react";

const CoursesData = [
  {
    title: "Next Level Web development",
    provider: "Programming Hero",
    year: "2024",
  },
  {
    title: "Web development",
    provider: "Programming Hero",
    year: "2023",
  },
];

const CoursesSection = () => {
  return (
    <section className="bg-card py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="mb-16 flex items-center gap-4">
          <BookOpen className="text-primary size-8" />
          <h2 className="text-3xl font-bold">Courses</h2>
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
                <p className="text-muted-foreground mt-1">{course.provider}</p>
              </div>
              <span className="text-primary mt-4 text-sm font-bold">
                {course.year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
