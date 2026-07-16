import Article from "@/app/api/articles/article.model";
import AuditEvent from "@/app/api/audit-events/audit-event.model";
import * as ContactRepository from "@/app/api/contacts/contact.repository";
import File from "@/app/api/files/file.model";
import OutboxEvent from "@/app/api/outbox-events/outbox-event.model";
import Project from "@/app/api/projects/project.model";
import Site from "@/app/api/site/site.model";
import Contact from "@/app/api/contacts/contact.model";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import type {
  TDashboardActivityRow,
  TDashboardCountRow,
  TDashboardContentHealth,
  TDashboardInquiryRow,
  TDashboardRawSnapshot,
} from "./dashboard.type";

type TContentFacet = Readonly<{
  statuses: TDashboardCountRow[];
  pillars: TDashboardCountRow[];
  health: Array<TDashboardContentHealth>;
}>;

const emptyHealth = (): TDashboardContentHealth => ({
  incomplete: 0,
  stale_drafts: 0,
  missing_media: 0,
  broken_links: 0,
});

export const getDashboardRawSnapshot = async (
  now = new Date()
): Promise<TDashboardRawSnapshot> => {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const staleBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const [
    site,
    articleSnapshot,
    projectSnapshot,
    inbox,
    mediaProviders,
    mediaLifecycle,
    mediaMetadata,
    outboxStatuses,
    oldestOutbox,
    recentAuditCount,
    latestAudit,
    recentInquiries,
    publishActivity,
  ] = await Promise.all([
    Site.findOne({ site_key: "primary" })
      .select("revision published.revision published.published_at updated_at")
      .lean(),
    Article.aggregate<TContentFacet>([
      {
        $facet: {
          statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          pillars: [
            {
              $match: {
                status: "published",
                primary_pillar: { $in: PILLAR_KEYS },
              },
            },
            { $group: { _id: "$primary_pillar", count: { $sum: 1 } } },
          ],
          health: [
            {
              $group: {
                _id: null,
                incomplete: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          {
                            $not: [
                              {
                                $gt: [
                                  { $strLenCP: { $ifNull: ["$slug", ""] } },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $not: [
                              {
                                $gt: [
                                  { $strLenCP: { $ifNull: ["$excerpt", ""] } },
                                  0,
                                ],
                              },
                            ],
                          },
                          { $not: [{ $in: ["$primary_pillar", PILLAR_KEYS] }] },
                          {
                            $not: [
                              {
                                $gt: [
                                  { $ifNull: ["$reading_time_minutes", 0] },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $eq: [{ $ifNull: ["$body_metadata", null] }, null],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                stale_drafts: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $in: ["$status", ["draft", "pending"]] },
                          { $lt: ["$updated_at", staleBefore] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                missing_media: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "published"] },
                          { $eq: [{ $ifNull: ["$thumbnail", null] }, null] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                broken_links: { $sum: 0 },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ]).exec(),
    Project.aggregate<TContentFacet>([
      {
        $facet: {
          statuses: [
            { $group: { _id: "$publication_status", count: { $sum: 1 } } },
          ],
          pillars: [
            {
              $match: {
                publication_status: "published",
                primary_pillar: { $in: PILLAR_KEYS },
              },
            },
            { $group: { _id: "$primary_pillar", count: { $sum: 1 } } },
          ],
          health: [
            {
              $group: {
                _id: null,
                incomplete: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          {
                            $not: [
                              {
                                $gt: [
                                  { $strLenCP: { $ifNull: ["$slug", ""] } },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $not: [
                              {
                                $gt: [
                                  {
                                    $strLenCP: {
                                      $ifNull: ["$description", ""],
                                    },
                                  },
                                  0,
                                ],
                              },
                            ],
                          },
                          { $not: [{ $in: ["$primary_pillar", PILLAR_KEYS] }] },
                          {
                            $not: [
                              {
                                $gt: [
                                  { $strLenCP: { $ifNull: ["$problem", ""] } },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $not: [
                              {
                                $gt: [
                                  { $strLenCP: { $ifNull: ["$role", ""] } },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $not: [
                              {
                                $gt: [
                                  {
                                    $strLenCP: {
                                      $ifNull: ["$architecture", ""],
                                    },
                                  },
                                  0,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                stale_drafts: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$publication_status", "draft"] },
                          { $lt: ["$updated_at", staleBefore] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                missing_media: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$publication_status", "published"] },
                          { $eq: [{ $ifNull: ["$thumbnail", null] }, null] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                broken_links: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          {
                            $and: [
                              { $eq: ["$live_url_visibility", "public"] },
                              {
                                $not: [
                                  {
                                    $gt: [
                                      {
                                        $strLenCP: {
                                          $ifNull: ["$live_url", ""],
                                        },
                                      },
                                      0,
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            $and: [
                              { $eq: ["$source_url_visibility", "public"] },
                              {
                                $not: [
                                  {
                                    $gt: [
                                      {
                                        $strLenCP: {
                                          $ifNull: ["$source_url", ""],
                                        },
                                      },
                                      0,
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ]).exec(),
    ContactRepository.getContactAggregateSnapshot(now),
    File.aggregate<TDashboardCountRow>([
      { $group: { _id: "$provider", count: { $sum: 1 } } },
    ]).exec(),
    File.aggregate<TDashboardCountRow>([
      { $group: { _id: "$lifecycle_state", count: { $sum: 1 } } },
    ]).exec(),
    File.aggregate<TDashboardCountRow>([
      { $group: { _id: "$metadata_status", count: { $sum: 1 } } },
    ]).exec(),
    OutboxEvent.aggregate<TDashboardCountRow>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec(),
    OutboxEvent.findOne({ status: "pending" })
      .select("next_attempt_at")
      .sort({ next_attempt_at: 1, _id: 1 })
      .lean(),
    AuditEvent.countDocuments({ created_at: { $gte: since, $lte: now } }),
    AuditEvent.findOne({ created_at: { $lte: now } })
      .select("created_at")
      .sort({ created_at: -1, _id: -1 })
      .lean(),
    Contact.find({ created_at: { $lte: now } })
      .select("status delivery_status created_at")
      .sort({ created_at: -1, _id: -1 })
      .limit(5)
      .lean()
      .then((rows) =>
        rows.map((row) => ({
          id: String(row._id),
          status: row.status,
          delivery_status: row.delivery_status,
          created_at: row.created_at,
        }))
      ) as Promise<TDashboardInquiryRow[]>,
    AuditEvent.find({
      action: { $in: ["content.published", "site.settings.updated"] },
      created_at: { $lte: now },
    })
      .select("action target_type summary_code created_at")
      .sort({ created_at: -1, _id: -1 })
      .limit(8)
      .lean<TDashboardActivityRow[]>(),
  ]);

  const articles = articleSnapshot[0];
  const projects = projectSnapshot[0];

  return {
    site,
    article_statuses: articles?.statuses ?? [],
    project_statuses: projects?.statuses ?? [],
    article_pillars: articles?.pillars ?? [],
    project_pillars: projects?.pillars ?? [],
    article_health: articles?.health[0] ?? emptyHealth(),
    project_health: projects?.health[0] ?? emptyHealth(),
    inbox,
    media_providers: mediaProviders,
    media_lifecycle: mediaLifecycle,
    media_metadata: mediaMetadata,
    outbox_statuses: outboxStatuses,
    outbox_oldest_due_at: oldestOutbox?.next_attempt_at ?? null,
    audit_recent_24h: recentAuditCount,
    audit_latest_at: latestAudit?.created_at ?? null,
    recent_inquiries: recentInquiries,
    publish_activity: publishActivity,
  };
};
