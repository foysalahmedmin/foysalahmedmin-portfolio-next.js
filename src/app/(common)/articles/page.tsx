import ArticlesContentSection from "@/components/(common)/articles-page/articles-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles | Foysal Ahmed",
  description:
    "Thoughts, tutorials, and insights about web development and technology.",
};

const ArticlesPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Articles", href: "/articles" },
  ];

  return (
    <main className="min-h-screen">
      <PageHeaderSection
        title="My Articles"
        description="Thoughts, tutorials, and insights about web development and technology."
        breadcrumbItems={breadcrumbItems}
      />

      <ArticlesContentSection />
    </main>
  );
};

export default ArticlesPage;
