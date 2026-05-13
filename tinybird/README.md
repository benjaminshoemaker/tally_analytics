# Tinybird Assets

The runtime analytics source of truth is `apps/web/lib/analytics/service.ts`.
This directory only keeps Tinybird assets that are still maintained outside the
runtime service. Dashboard query pipes were removed because they duplicated the
inline Tinybird SQL in the service and could drift independently.
