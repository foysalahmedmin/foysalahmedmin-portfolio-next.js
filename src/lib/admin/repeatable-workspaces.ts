import type { TClaimVerificationState } from "@/app/api/repeatable-content/record.type";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";

export const REPEATABLE_ADMIN_WORKSPACE_KEYS = [
  "services",
  "skill-groups",
  "skills",
  "timeline",
  "credentials",
  "faqs",
  "testimonials",
  "legal-documents",
] as const;

export type RepeatableAdminWorkspaceKey =
  (typeof REPEATABLE_ADMIN_WORKSPACE_KEYS)[number];

export type RepeatableAdminOption = Readonly<{
  label: string;
  value: string;
}>;

type BaseField = Readonly<{
  name: string;
  label: string;
  help?: string;
  required?: boolean;
}>;

export type RepeatableAdminField =
  | (BaseField & {
      type: "text" | "url" | "object-id";
      maxLength?: number;
      placeholder?: string;
    })
  | (BaseField & {
      type: "textarea";
      maxLength: number;
      rows?: number;
      placeholder?: string;
    })
  | (BaseField & {
      type: "select";
      options: readonly RepeatableAdminOption[];
    })
  | (BaseField & {
      type: "reference";
      endpoint: string;
      emptyLabel: string;
      matchField?: "primary_pillar" | "type";
    })
  | (BaseField & {
      type: "list";
      maxItems?: number;
      placeholder?: string;
    })
  | (BaseField & {
      type: "multi-select";
      options: readonly RepeatableAdminOption[];
    })
  | (BaseField & {
      type: "number";
      min?: number;
      max?: number;
      step?: number;
    })
  | (BaseField & {
      type: "datetime";
    })
  | (BaseField & {
      type: "boolean";
    })
  | (BaseField & {
      type: "actor";
    })
  | (BaseField & {
      type: "legal-sections";
    });

export type RepeatableAdminFilter = Readonly<{
  id: string;
  label: string;
  allLabel: string;
  options: readonly RepeatableAdminOption[];
}>;

export type RepeatableAdminDetailColumn = Readonly<{
  key: string;
  label: string;
  kind?: "text" | "date" | "status";
  defaultVisible?: boolean;
}>;

export type RepeatableAdminWorkspace = Readonly<{
  key: RepeatableAdminWorkspaceKey;
  label: string;
  singular: string;
  description: string;
  apiPath: string;
  defaultSort: string;
  searchPlaceholder: string;
  supportsPillars: boolean;
  claimVerificationOptions: readonly RepeatableAdminOption[];
  fields: readonly RepeatableAdminField[];
  filters: readonly RepeatableAdminFilter[];
  detailColumns: readonly RepeatableAdminDetailColumn[];
}>;

const option = (value: string, label: string): RepeatableAdminOption => ({
  value,
  label,
});

export const PILLAR_OPTIONS = PILLAR_CONTRACT.map(({ key, label }) =>
  option(key, label)
);

const ICON_OPTIONS = [
  "code-window",
  "server-stack",
  "automation-node",
  "system-blueprint",
  "pipeline-stages",
  "full-stack-layers",
  "layers",
  "shield",
  "gauge",
  "workflow",
  "database",
  "cloud",
  "accessibility",
  "award",
  "book",
  "briefcase",
  "graduation-cap",
  "help-circle",
  "quote",
  "file-text",
].map((key) =>
  option(
    key,
    key
      .split("-")
      .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
      .join(" ")
  )
);

const STATUS_FILTER: RepeatableAdminFilter = {
  id: "status",
  label: "Publication status",
  allLabel: "All publication states",
  options: [
    option("draft", "Draft"),
    option("published", "Published"),
    option("archived", "Archived"),
  ],
};

const FEATURED_FILTER: RepeatableAdminFilter = {
  id: "featured",
  label: "Featured state",
  allLabel: "All featured states",
  options: [option("true", "Featured"), option("false", "Not featured")],
};

const DELETION_FILTER: RepeatableAdminFilter = {
  id: "deleted_scope",
  label: "Record lifecycle",
  allLabel: "Active records",
  options: [
    option("with_deleted", "Active and deleted"),
    option("only_deleted", "Deleted records only"),
  ],
};

const PILLAR_FILTER: RepeatableAdminFilter = {
  id: "pillar",
  label: "Primary discipline",
  allLabel: "All disciplines",
  options: PILLAR_OPTIONS,
};

const NOT_APPLICABLE_CLAIM = [
  option("not_applicable", "Not applicable"),
] as const;
const EVIDENCE_CLAIMS = [
  option("unverified", "Unverified"),
  option("derived", "Derived from evidence"),
  option("verified", "Verified"),
] as const satisfies readonly RepeatableAdminOption[];
const VERIFIED_CLAIMS = [
  option("unverified", "Unverified"),
  option("verified", "Verified"),
] as const satisfies readonly RepeatableAdminOption[];

const verificationSourceFields = (
  options: readonly RepeatableAdminOption[]
): readonly RepeatableAdminField[] => [
  {
    name: "verification_source",
    label: "Evidence source",
    type: "select",
    options,
    help: "Choose the bounded source used to support this claim.",
  },
  {
    name: "verification_reference",
    label: "Evidence reference",
    type: "text",
    maxLength: 240,
    help: "Use a private, non-sensitive reference; public output never exposes it.",
  },
  {
    name: "verified_at",
    label: "Verified at",
    type: "datetime",
  },
  {
    name: "verified_by",
    label: "Verification reviewer",
    type: "actor",
    help: "Checking this records the currently signed-in administrator as reviewer.",
  },
];

const WORKSPACES = {
  services: {
    key: "services",
    label: "Services",
    singular: "service",
    description:
      "Maintain outcome-led service capabilities without embedding process or metrics as separate content.",
    apiPath: "services",
    defaultSort: "sequence",
    searchPlaceholder: "Search services by title, summary, or capability…",
    supportsPillars: true,
    claimVerificationOptions: NOT_APPLICABLE_CLAIM,
    fields: [
      {
        name: "outcome",
        label: "Client outcome",
        type: "textarea",
        maxLength: 600,
        rows: 4,
        required: true,
      },
      {
        name: "capabilities",
        label: "Capabilities",
        type: "list",
        required: true,
        placeholder: "One capability per line",
      },
      {
        name: "deliverables",
        label: "Deliverables",
        type: "list",
        placeholder: "One deliverable per line",
      },
      {
        name: "technologies",
        label: "Technologies",
        type: "list",
        placeholder: "One technology per line",
      },
      {
        name: "icon_key",
        label: "System icon",
        type: "select",
        options: ICON_OPTIONS,
      },
    ],
    filters: [PILLAR_FILTER, STATUS_FILTER, FEATURED_FILTER, DELETION_FILTER],
    detailColumns: [
      { key: "outcome", label: "Outcome", defaultVisible: false },
    ],
  },
  "skill-groups": {
    key: "skill-groups",
    label: "Skill groups",
    singular: "skill group",
    description:
      "Organize skills into evidence-aligned groups mapped to the five engineering disciplines.",
    apiPath: "skill-groups",
    defaultSort: "sequence",
    searchPlaceholder: "Search skill groups…",
    supportsPillars: true,
    claimVerificationOptions: NOT_APPLICABLE_CLAIM,
    fields: [
      {
        name: "description",
        label: "Description",
        type: "textarea",
        maxLength: 1_200,
        rows: 5,
        required: true,
      },
      {
        name: "icon_key",
        label: "System icon",
        type: "select",
        options: ICON_OPTIONS,
      },
    ],
    filters: [PILLAR_FILTER, STATUS_FILTER, FEATURED_FILTER, DELETION_FILTER],
    detailColumns: [
      { key: "description", label: "Description", defaultVisible: false },
    ],
  },
  skills: {
    key: "skills",
    label: "Skills",
    singular: "skill",
    description:
      "Publish only bounded proficiency claims backed by a valid skill group and evidence reference.",
    apiPath: "skills",
    defaultSort: "sequence",
    searchPlaceholder: "Search skills or evidence keywords…",
    supportsPillars: true,
    claimVerificationOptions: EVIDENCE_CLAIMS,
    fields: [
      {
        name: "group",
        label: "Skill group",
        type: "reference",
        endpoint: "/api/skill-groups/admin?limit=50&sort=title",
        emptyLabel: "Select a skill group",
        matchField: "primary_pillar",
        required: true,
      },
      {
        name: "proficiency_level",
        label: "Proficiency level",
        type: "select",
        options: [
          option("foundational", "Foundational"),
          option("working", "Working"),
          option("advanced", "Advanced"),
          option("expert", "Expert"),
        ],
        required: true,
      },
      ...verificationSourceFields([
        option("project", "Project"),
        option("credential", "Credential"),
        option("article", "Article"),
        option("work_history", "Work history"),
        option("manual_review", "Manual review"),
      ]),
      {
        name: "years_experience",
        label: "Years of experience",
        type: "number",
        min: 0,
        max: 60,
        step: 0.5,
        help: "Optional and shown only when the record meets publication evidence rules.",
      },
      {
        name: "keywords",
        label: "Evidence keywords",
        type: "list",
        placeholder: "One keyword per line",
      },
    ],
    filters: [
      PILLAR_FILTER,
      {
        id: "proficiency",
        label: "Proficiency level",
        allLabel: "All proficiency levels",
        options: [
          option("foundational", "Foundational"),
          option("working", "Working"),
          option("advanced", "Advanced"),
          option("expert", "Expert"),
        ],
      },
      STATUS_FILTER,
      FEATURED_FILTER,
      DELETION_FILTER,
    ],
    detailColumns: [
      { key: "proficiency_level", label: "Proficiency", kind: "status" },
    ],
  },
  timeline: {
    key: "timeline",
    label: "Timeline",
    singular: "timeline entry",
    description:
      "Manage experience and education records with explicit evidence and date integrity.",
    apiPath: "timeline",
    defaultSort: "-started_at",
    searchPlaceholder: "Search experience or education…",
    supportsPillars: true,
    claimVerificationOptions: EVIDENCE_CLAIMS,
    fields: [
      {
        name: "type",
        label: "Timeline type",
        type: "select",
        options: [
          option("experience", "Experience"),
          option("education", "Education"),
        ],
        required: true,
      },
      {
        name: "organization",
        label: "Organization",
        type: "text",
        maxLength: 180,
        required: true,
      },
      {
        name: "position",
        label: "Position or program",
        type: "text",
        maxLength: 180,
        required: true,
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        maxLength: 160,
      },
      {
        name: "started_at",
        label: "Started at",
        type: "datetime",
        required: true,
      },
      { name: "ended_at", label: "Ended at", type: "datetime" },
      {
        name: "is_current",
        label: "Current position or study",
        type: "boolean",
        help: "Current entries cannot also have an end date.",
      },
      {
        name: "highlights",
        label: "Verified highlights",
        type: "list",
        placeholder: "One evidence-backed highlight per line",
      },
      {
        name: "technologies",
        label: "Technologies",
        type: "list",
        placeholder: "One technology per line",
      },
      ...verificationSourceFields([
        option("document", "Document"),
        option("public_record", "Public record"),
        option("manual_review", "Manual review"),
      ]),
    ],
    filters: [
      {
        id: "type",
        label: "Timeline type",
        allLabel: "Experience and education",
        options: [
          option("experience", "Experience"),
          option("education", "Education"),
        ],
      },
      PILLAR_FILTER,
      STATUS_FILTER,
      FEATURED_FILTER,
      DELETION_FILTER,
    ],
    detailColumns: [
      { key: "type", label: "Type", kind: "status" },
      { key: "organization", label: "Organization" },
      { key: "started_at", label: "Started", kind: "date" },
    ],
  },
  credentials: {
    key: "credentials",
    label: "Credentials",
    singular: "credential",
    description:
      "Maintain certifications, courses, and awards without publishing unverifiable credential claims.",
    apiPath: "credentials",
    defaultSort: "-issued_at",
    searchPlaceholder: "Search credentials or issuers…",
    supportsPillars: true,
    claimVerificationOptions: VERIFIED_CLAIMS,
    fields: [
      {
        name: "type",
        label: "Credential type",
        type: "select",
        options: [
          option("certification", "Certification"),
          option("course", "Course"),
          option("award", "Award"),
        ],
        required: true,
      },
      {
        name: "issuer",
        label: "Issuer",
        type: "text",
        maxLength: 180,
        required: true,
      },
      {
        name: "issued_at",
        label: "Issued at",
        type: "datetime",
        required: true,
      },
      { name: "expires_at", label: "Expires at", type: "datetime" },
      {
        name: "credential_url",
        label: "Public credential URL",
        type: "url",
        placeholder: "https://…",
      },
      {
        name: "credential_id",
        label: "Credential ID",
        type: "text",
        maxLength: 180,
      },
      ...verificationSourceFields([
        option("issuer", "Issuer"),
        option("document", "Document"),
        option("manual_review", "Manual review"),
      ]),
    ],
    filters: [
      {
        id: "type",
        label: "Credential type",
        allLabel: "All credential types",
        options: [
          option("certification", "Certification"),
          option("course", "Course"),
          option("award", "Award"),
        ],
      },
      PILLAR_FILTER,
      STATUS_FILTER,
      FEATURED_FILTER,
      DELETION_FILTER,
    ],
    detailColumns: [
      { key: "type", label: "Type", kind: "status" },
      { key: "issuer", label: "Issuer" },
      { key: "issued_at", label: "Issued", kind: "date" },
    ],
  },
  faqs: {
    key: "faqs",
    label: "FAQs",
    singular: "FAQ",
    description:
      "Maintain concise client-facing answers; process details remain part of the Site and Page contracts.",
    apiPath: "faqs",
    defaultSort: "sequence",
    searchPlaceholder: "Search questions, answers, or keywords…",
    supportsPillars: true,
    claimVerificationOptions: NOT_APPLICABLE_CLAIM,
    fields: [
      {
        name: "answer",
        label: "Answer",
        type: "textarea",
        maxLength: 5_000,
        rows: 10,
        required: true,
      },
      {
        name: "category",
        label: "FAQ category",
        type: "select",
        options: [
          option("general", "General"),
          option("services", "Services"),
          option("process", "Process"),
          option("engagement", "Engagement"),
          option("technical", "Technical"),
        ],
        required: true,
      },
      {
        name: "keywords",
        label: "Search keywords",
        type: "list",
        placeholder: "One keyword per line",
      },
    ],
    filters: [
      {
        id: "category",
        label: "FAQ category",
        allLabel: "All FAQ categories",
        options: [
          option("general", "General"),
          option("services", "Services"),
          option("process", "Process"),
          option("engagement", "Engagement"),
          option("technical", "Technical"),
        ],
      },
      PILLAR_FILTER,
      STATUS_FILTER,
      FEATURED_FILTER,
      DELETION_FILTER,
    ],
    detailColumns: [{ key: "category", label: "Category", kind: "status" }],
  },
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    singular: "testimonial",
    description:
      "Review consent and verification evidence before any testimonial can be published.",
    apiPath: "testimonials",
    defaultSort: "-updated_at",
    searchPlaceholder: "Search testimonials, people, or organizations…",
    supportsPillars: false,
    claimVerificationOptions: VERIFIED_CLAIMS,
    fields: [
      {
        name: "quote",
        label: "Testimonial quote",
        type: "textarea",
        maxLength: 2_000,
        rows: 7,
        required: true,
      },
      {
        name: "person_name",
        label: "Person name",
        type: "text",
        maxLength: 160,
        required: true,
      },
      {
        name: "person_role",
        label: "Person role",
        type: "text",
        maxLength: 160,
      },
      {
        name: "organization",
        label: "Organization",
        type: "text",
        maxLength: 180,
      },
      {
        name: "relationship",
        label: "Relationship",
        type: "select",
        options: [
          option("client", "Client"),
          option("collaborator", "Collaborator"),
          option("manager", "Manager"),
          option("peer", "Peer"),
          option("direct_report", "Direct report"),
        ],
        required: true,
      },
      {
        name: "source_type",
        label: "Source type",
        type: "select",
        options: [
          option("direct", "Direct"),
          option("email", "Email"),
          option("linkedin", "LinkedIn"),
          option("public_profile", "Public profile"),
          option("document", "Document"),
        ],
        required: true,
      },
      {
        name: "source_reference",
        label: "Private source reference",
        type: "text",
        maxLength: 240,
        help: "Required to publish and never included in the public DTO.",
      },
      {
        name: "source_label",
        label: "Public source label",
        type: "text",
        maxLength: 160,
      },
      {
        name: "source_url",
        label: "Public source URL",
        type: "url",
        placeholder: "https://…",
      },
      {
        name: "consent_status",
        label: "Consent status",
        type: "select",
        options: [
          option("pending", "Pending"),
          option("granted", "Granted"),
          option("revoked", "Revoked"),
        ],
        required: true,
      },
      {
        name: "consent_scopes",
        label: "Explicit consent scopes",
        type: "multi-select",
        options: [
          option("public_site", "Public site"),
          option("marketing", "Marketing"),
          option("source_attribution", "Source attribution"),
        ],
        help: "Public-site consent is required before publication.",
      },
      { name: "consented_at", label: "Consent confirmed at", type: "datetime" },
      { name: "verified_at", label: "Verified at", type: "datetime" },
      {
        name: "verified_by",
        label: "Verification reviewer",
        type: "actor",
        help: "Checking this records the currently signed-in administrator as reviewer.",
      },
    ],
    filters: [
      {
        id: "consent",
        label: "Consent queue",
        allLabel: "All consent states",
        options: [
          option("pending", "Pending consent"),
          option("granted", "Consent granted"),
          option("revoked", "Consent revoked"),
        ],
      },
      {
        id: "verification",
        label: "Verification queue",
        allLabel: "All verification states",
        options: [
          option("unverified", "Unverified"),
          option("verified", "Verified"),
        ],
      },
      {
        id: "relationship",
        label: "Relationship",
        allLabel: "All relationships",
        options: [
          option("client", "Client"),
          option("collaborator", "Collaborator"),
          option("manager", "Manager"),
          option("peer", "Peer"),
          option("direct_report", "Direct report"),
        ],
      },
      STATUS_FILTER,
      FEATURED_FILTER,
      DELETION_FILTER,
    ],
    detailColumns: [
      { key: "person_name", label: "Person" },
      { key: "consent_status", label: "Consent", kind: "status" },
      {
        key: "claim_verification",
        label: "Verification",
        kind: "status",
      },
    ],
  },
  "legal-documents": {
    key: "legal-documents",
    label: "Legal documents",
    singular: "legal document",
    description:
      "Create reviewed, effective, versioned legal records with explicit supersession links.",
    apiPath: "legal-documents",
    defaultSort: "-effective_at",
    searchPlaceholder: "Search legal documents or sections…",
    supportsPillars: false,
    claimVerificationOptions: NOT_APPLICABLE_CLAIM,
    fields: [
      {
        name: "type",
        label: "Document type",
        type: "select",
        options: [
          option("privacy", "Privacy"),
          option("terms", "Terms"),
          option("accessibility", "Accessibility"),
        ],
        required: true,
      },
      {
        name: "document_version",
        label: "Document version",
        type: "text",
        placeholder: "1.0",
        help: "Use a numeric version such as 1.0 or 2.1.0.",
        required: true,
      },
      {
        name: "effective_at",
        label: "Effective at",
        type: "datetime",
        required: true,
      },
      {
        name: "sections",
        label: "Document sections",
        type: "legal-sections",
        required: true,
      },
      { name: "reviewed_at", label: "Reviewed at", type: "datetime" },
      {
        name: "reviewed_by",
        label: "Legal reviewer",
        type: "actor",
        help: "Checking this records the currently signed-in administrator as reviewer.",
      },
      {
        name: "supersedes",
        label: "Superseded document",
        type: "reference",
        endpoint: "/api/legal-documents/admin?limit=50&sort=-effective_at",
        emptyLabel: "This document does not supersede another version",
        matchField: "type",
      },
    ],
    filters: [
      {
        id: "type",
        label: "Document type",
        allLabel: "All legal document types",
        options: [
          option("privacy", "Privacy"),
          option("terms", "Terms"),
          option("accessibility", "Accessibility"),
        ],
      },
      STATUS_FILTER,
      DELETION_FILTER,
    ],
    detailColumns: [
      { key: "type", label: "Type", kind: "status" },
      { key: "document_version", label: "Version" },
      { key: "effective_at", label: "Effective", kind: "date" },
    ],
  },
} as const satisfies Record<
  RepeatableAdminWorkspaceKey,
  RepeatableAdminWorkspace
>;

export const REPEATABLE_ADMIN_WORKSPACES: Readonly<
  Record<RepeatableAdminWorkspaceKey, RepeatableAdminWorkspace>
> = WORKSPACES;

export const isRepeatableAdminWorkspaceKey = (
  value: string
): value is RepeatableAdminWorkspaceKey =>
  REPEATABLE_ADMIN_WORKSPACE_KEYS.includes(
    value as RepeatableAdminWorkspaceKey
  );

export const getRepeatableAdminWorkspace = (
  key: string
): RepeatableAdminWorkspace | null =>
  isRepeatableAdminWorkspaceKey(key) ? REPEATABLE_ADMIN_WORKSPACES[key] : null;

export const getDefaultClaimVerification = (
  workspace: RepeatableAdminWorkspace
): TClaimVerificationState =>
  workspace.claimVerificationOptions[0].value as TClaimVerificationState;
