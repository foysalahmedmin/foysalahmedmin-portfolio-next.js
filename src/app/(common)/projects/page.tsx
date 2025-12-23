import ProjectsContentSection from "@/components/(common)/projects-page/projects-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Foysal Ahmed",
  description:
    "Explore a selection of my recent work across web development, system engineering, and design.",
};

const ProjectsPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Projects", href: "/projects" },
  ];

  return (
    <main className="min-h-screen pb-20">
      <PageHeaderSection
        title="Browse My Projects"
        description="Explore a selection of my recent work across web development, system engineering, and design."
        breadcrumbItems={breadcrumbItems}
      />

      <ProjectsContentSection />
    </main>
  );
};

export default ProjectsPage;
