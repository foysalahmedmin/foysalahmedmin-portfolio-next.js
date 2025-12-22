import { getProjectById } from "@/services/project.service";
import { TProject } from "@/types/project.type";
import { Metadata } from "next";
import ProjectDetailsContent from "./project-details-content";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await getProjectById(id);
    const project = res.data as TProject;
    return {
      title: `${project.name} | Portfolio | Foysal Ahmed`,
      description: project.description,
      openGraph: {
        images: project.thumbnail ? [project.thumbnail] : [],
      },
    };
  } catch (e) {
    return {
      title: "Project | Foysal Ahmed",
    };
  }
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { id } = await params;
  const res = await getProjectById(id);
  const project = res.data as TProject;

  return <ProjectDetailsContent project={project} />;
}
