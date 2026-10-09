import { DetailLayout } from "@/components/templates";
import * as VideoService from "@/app/api/videos/video.service";
import VideoDetailsSection from "@/components/(common)/videos-page/video-details-section";
import { JsonLdScript } from "@/components/content/json-ld-script";
import AppError from "@/builder/app-error";
import { toYouTubeThumbnailUrl } from "@/lib/content/video-contract";
import { toSerializableVideoListItem } from "@/lib/discovery/video-discovery";
import {
  buildBreadcrumbJsonLd,
  buildVideoJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { readPublishedSite } from "@/lib/site/published-site";
import type { TVideoListItem } from "@/types/video.type";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const readVideo = async (id: string): Promise<TVideoListItem> => {
  const record = await VideoService.getPublicVideoByIdentifier(id);
  const video = toSerializableVideoListItem(record);
  if (!video) {
    throw new AppError(404, "Video not found");
  }
  return video;
};

const asMetadataImage = (file: TVideoListItem["thumbnail"]) =>
  file
    ? {
        id: file._id,
        url: file.url,
        ...(file.alt_text ? { alt_text: file.alt_text } : {}),
        ...(file.metadata?.width && typeof file.metadata.width === "number"
          ? { width: file.metadata.width }
          : {}),
        ...(file.metadata?.height && typeof file.metadata.height === "number"
          ? { height: file.metadata.height }
          : {}),
      }
    : undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const site = await readPublishedSite();
  try {
    const video = await readVideo(id);
    return buildPageMetadata(site, {
      pathname: `/videos/${video.slug ?? id}`,
      title: video.name,
      description: video.description,
      kind: "page",
      image: asMetadataImage(video.thumbnail),
    });
  } catch {
    return {
      title: "Video unavailable",
      robots: { index: false, follow: false },
    };
  }
}

export default async function VideoDetailsPage({ params }: Props) {
  const { id } = await params;
  let video: TVideoListItem;
  try {
    video = await readVideo(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  if (video.slug && video.slug !== id) {
    permanentRedirect(`/videos/${video.slug}`);
  }

  const [site, relatedResult] = await Promise.all([
    readPublishedSite(),
    VideoService.getPublicVideoDiscovery({
      aspect_ratio: video.aspect_ratio,
      sort: "newest",
      limit: 8,
    }).catch(() => ({ data: [] })),
  ]);
  const related = relatedResult.data
    .flatMap((record) => {
      const item = toSerializableVideoListItem(record);
      return item ? [item] : [];
    })
    .filter((item) => item._id !== video._id)
    .slice(0, video.aspect_ratio === "reel" ? 4 : 3);

  const pathname = `/videos/${video.slug ?? id}`;
  const structuredData = [
    buildWebPageJsonLd(site, {
      pathname,
      title: video.name,
      description: video.description,
    }),
    buildVideoJsonLd(site, {
      pathname,
      title: video.name,
      description: video.description,
      published_at: video.published_at,
      thumbnail_url:
        video.thumbnail?.url ??
        (video.youtube_id
          ? toYouTubeThumbnailUrl(video.youtube_id)
          : undefined),
      embed_url: video.youtube_id
        ? `https://www.youtube.com/embed/${video.youtube_id}`
        : undefined,
      content_url: video.video_file?.url,
      duration_seconds: video.duration_seconds,
      keywords: video.keywords,
    }),
    buildBreadcrumbJsonLd(site, [
      { name: "Home", pathname: "/" },
      { name: "Videos", pathname: "/videos" },
      { name: video.name, pathname },
    ]),
  ].filter((item) => item !== null);

  return (
    <>
      <JsonLdScript data={structuredData} />
      <DetailLayout route="video" site={site}>
        <VideoDetailsSection video={video} related={related} />
      </DetailLayout>
    </>
  );
}
