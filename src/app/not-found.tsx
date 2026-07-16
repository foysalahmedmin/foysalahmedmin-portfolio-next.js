import { Container, Section, Stack } from "@/components/ui/layout";
import { buildNoIndexMetadata } from "@/lib/metadata/noindex";
import Link from "next/link";

export const metadata = buildNoIndexMetadata({ title: "Not found" });

export default function NotFound() {
  return (
    <main>
      <Section>
        <Container measure="reading">
          <Stack gap="md" className="text-center">
            <p className="type-label text-primary">404 · Not found</p>
            <h1 className="type-heading-1">This work is not available.</h1>
            <p className="type-lead mx-auto">
              The address may be outdated, or this content may no longer be
              published.
            </p>
            <div>
              <Link
                href="/"
                className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-full px-6 font-semibold"
              >
                Return home
              </Link>
            </div>
          </Stack>
        </Container>
      </Section>
    </main>
  );
}
