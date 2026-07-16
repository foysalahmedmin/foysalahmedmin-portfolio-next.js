import { serializeJsonLd, type TJsonLdPayload } from "@/lib/metadata/json-ld";

type JsonLdScriptProps = {
  data: TJsonLdPayload | null;
};

export const JsonLdScript = ({ data }: JsonLdScriptProps) => {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
};
