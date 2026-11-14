import { DYNAMIC_OG_IMAGE_CONTRACT } from "@/lib/metadata/open-graph";
import { buildShareCardText } from "@/lib/metadata/share-card";
import { readPublishedSite } from "@/lib/site/published-site";
import { ImageResponse } from "next/og";

// Same window as the public pages, so a renamed Site reaches the previews within the hour
export const revalidate = 3600;

export async function GET() {
  const card = buildShareCardText(await readPublishedSite());
  if (!card) return new Response(null, { status: 404 });

  const { width, height } = DYNAMIC_OG_IMAGE_CONTRACT;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            paddingBottom: 28,
            borderBottom: "2px solid #2a2a2a",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#ababab",
          }}
        >
          {card.host}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: card.name.length > 28 ? 72 : 104,
              lineHeight: 1.05,
            }}
          >
            {card.name}
          </div>
          {card.line ? (
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 38,
                lineHeight: 1.3,
                color: "#ababab",
              }}
            >
              {card.line}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" },
    }
  );
}
