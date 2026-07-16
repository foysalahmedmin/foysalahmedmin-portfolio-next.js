# Dashboard aggregate contract

`GET /api/dashboard/admin` is a protected, private `no-store` snapshot generated from the database at request time. It has no query/projection surface and returns no contact PII.

The bounded response contains:

- Site configured/published state and real revisions/timestamps.
- Active Article and Project totals grouped by their persisted publication states.
- Active inbox totals grouped by status and delivery state, plus derived attention, retention-due, and active-hold counts.
- Active media totals grouped by provider, lifecycle, and metadata completeness.
- Contact outbox counts, oldest pending due time, a small derived state (`clear`, `work_pending`, or `attention_required`), and audit event count/latest timestamp.

Missing groups are represented as measured zeroes. Unknown legacy enum values are counted as `unclassified`; they are never silently discarded. The API intentionally does not claim uptime, conversion, revenue, response time, traffic, or other metrics that the current data model cannot truthfully derive.
