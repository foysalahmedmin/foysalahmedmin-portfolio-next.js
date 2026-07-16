export type TDashboardCountRow = Readonly<{
  _id: string | null;
  count: number;
}>;

export type TDashboardContentHealth = Readonly<{
  incomplete: number;
  stale_drafts: number;
  missing_media: number;
  broken_links: number;
}>;

export type TDashboardInquiryRow = Readonly<{
  id: string;
  status: string;
  delivery_status: string;
  created_at: Date | string;
}>;

export type TDashboardActivityRow = Readonly<{
  action: string;
  target_type: string;
  summary_code: string;
  created_at: Date | string;
}>;

export type TDashboardRawSnapshot = Readonly<{
  site: null | {
    revision?: number;
    published?: { revision?: number; published_at?: Date | string } | null;
    updated_at?: Date | string;
  };
  article_statuses: TDashboardCountRow[];
  project_statuses: TDashboardCountRow[];
  article_pillars: TDashboardCountRow[];
  project_pillars: TDashboardCountRow[];
  article_health: TDashboardContentHealth;
  project_health: TDashboardContentHealth;
  inbox: {
    statuses: TDashboardCountRow[];
    deliveries: TDashboardCountRow[];
    totals: {
      total: number;
      needs_attention: number;
      retention_due: number;
      active_holds: number;
    };
  };
  media_providers: TDashboardCountRow[];
  media_lifecycle: TDashboardCountRow[];
  media_metadata: TDashboardCountRow[];
  outbox_statuses: TDashboardCountRow[];
  outbox_oldest_due_at: Date | string | null;
  audit_recent_24h: number;
  audit_latest_at: Date | string | null;
  recent_inquiries: TDashboardInquiryRow[];
  publish_activity: TDashboardActivityRow[];
}>;
