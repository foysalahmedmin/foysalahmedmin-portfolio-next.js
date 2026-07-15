import { ArrowRight, Briefcase, FileText, Settings } from "lucide-react";
import Link from "next/link";

const workspaces = [
  {
    title: "Projects",
    description: "Review and maintain portfolio project records.",
    href: "/admin/projects",
    icon: Briefcase,
  },
  {
    title: "Articles",
    description: "Draft and manage long-form engineering content.",
    href: "/admin/articles",
    icon: FileText,
  },
  {
    title: "Profile settings",
    description: "Update the identity attached to this admin account.",
    href: "/admin/settings",
    icon: Settings,
  },
] as const;

const AdminDashboard = () => (
  <div className="space-y-10">
    <header className="max-w-3xl">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">
        Secure workspace
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Portfolio administration
      </h1>
      <p className="text-muted-foreground mt-3 text-base leading-7">
        Choose a workspace below. Metrics and activity will appear only after
        they are connected to verified application data.
      </p>
    </header>

    <section aria-labelledby="workspace-heading">
      <h2 id="workspace-heading" className="sr-only">
        Available workspaces
      </h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="border-border bg-card focus-visible:ring-primary group rounded-3xl border p-7 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="mt-6 flex items-center justify-between gap-4">
              <span className="text-xl font-bold">{title}</span>
              <ArrowRight
                className="text-muted-foreground size-5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
            <span className="text-muted-foreground mt-2 block text-sm leading-6">
              {description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  </div>
);

export default AdminDashboard;
