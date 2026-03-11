# Access Control Requirements (MVP)

## Summary

This document defines the minimum viable access-control model for the CSDR Cloud Spatial Platform.

It introduces:

- Multi-tenant organization scoping for all core resources
- Two organization roles: `admin` and `member`
- Visibility controls (`draft`, `private`, `public`) with a simplified model:
  - `draft` only for `dashboard` and `report`
  - `private/public` for `dataset`, `geometries`, `product`, `dashboard`, `report`
  - Child resources (`*_run`, outputs) inherit access from parent resources
- Full audit log and full read log coverage

This is designed for implementation using the existing `better-auth` organization plugin.

## Goals

- Enforce organization-scoped tenancy across console and explorer surfaces.
- Allow non-admin users to author dashboards/reports safely via drafts.
- Keep publish controls in admin hands.
- Keep v1 authorization simple and predictable.
- Support traceability and defensibility with complete access logging.

## Non-Goals (MVP)

- Per-resource sharing with specific users or external organizations.
- Custom roles beyond `admin` and `member`.
- Independent ACLs on run/output child resources.
- Fine-grained field-level or row-level policy controls.
- Complex policy engines (ABAC/ReBAC) beyond role + visibility + ownership checks.

## Terms

- Organization: Tenant boundary for private resources.
- Active Organization: Organization currently selected in the app context.
- Top-level ACL resource: Resource with explicit `organizationId`, owner, and visibility.
- Child resource: Resource whose access is inherited from a top-level parent.
- Public resource: Internet-readable resource (`visibility = public`), read-only for non-admin users.

## Resource Model

### Top-level ACL resources

- `dataset`
- `geometries`
- `product`
- `dashboard`
- `report`

Each top-level ACL resource must include:

- `organizationId` (required)
- `createdByUserId` (required)
- `visibility` (enum per resource type; see below)

### Child resources (inherited access; no independent ACL)

- `dataset_run` inherits from `dataset`
- `geometries_run` and `geometry_output` inherit from `geometries`
- `product_run` and `product_output` inherit from `product`

Child resources must not have their own visibility/ACL fields in MVP.

## Visibility Model

### Dataset / Geometries / Product

- `private`: visible to users in the owning organization only
- `public`: visible to anyone on the internet (read-only)

### Dashboard / Report

- `draft`: visible to creator and org admins only
- `private`: visible to users in the owning organization
- `public`: visible to anyone on the internet (read-only)

### Inheritance Rule

Child resource visibility is always equal to parent effective visibility.

Examples:

- If a `product` is `private`, all `product_run` and `product_output` are `private`.
- If a `dataset` is `public`, all `dataset_run` are `public`.

## Role Model (Organization-Scoped)

### `admin`

- Full read/write on all resources in the organization.
- Can create/edit/delete `dataset`, `geometries`, `product`, `dashboard`, `report`.
- Can change visibility for all top-level ACL resources in the organization.
- Can publish `dashboard/report` drafts to `private` or `public`.
- Can invite/remove users and assign org roles.
- Can view org audit/read logs.

### `member`

- Read access to all non-draft resources in the active organization.
- Can create `dashboard` and `report` in `draft` only.
- Can edit/delete only their own `dashboard/report` drafts.
- Cannot edit `private/public` dashboards or reports directly, even if they were the original creator.
- Cannot change visibility.
- Cannot create/edit/delete `dataset`, `geometries`, `product`, or inherited child resources.
- Cannot invite/remove users or change org roles.

## Organization and Membership Rules

- Every user must belong to at least one organization.
- On signup, create a personal organization workspace (e.g., `"<Name>'s Workspace"`).
- Signup user is `admin` in their personal workspace.
- Users may belong to multiple organizations.
- Selected active org controls tenant scope for authenticated app behavior.
- Only `admin` can invite users in MVP.
- Invitations default to `member`; `admin` may explicitly invite as `admin`.
- An organization must always have at least one `admin`.
- The last remaining org admin cannot:
  - demote themselves
  - remove themselves
  - leave the organization
- Removing or demoting an admin is allowed only if at least one other admin remains.

## Migration and Backfill (Existing Data)

For resources created before org ACL fields exist, migration must:

- Backfill all top-level ACL resources with `organizationId`, `createdByUserId`, and `visibility`.
- Assign resources with missing org ownership to a configured bootstrap org (`default-organization` in current environments).
- Assign missing `createdByUserId` to a configured bootstrap admin user (current seeded super-admin) when no reliable actor exists.
- Set default visibility on migrated records to `private`.
- Keep child resource access inherited from parent after migration (no child ACL backfill columns).
- Run idempotently and produce a migration report with counts by resource type and fallback assignments.

## Console vs Explorer Scope

- Console:
  - Shows resources scoped to the selected active organization only.
  - Includes private resources for that org (subject to role rules).
  - Does not browse private resources from other organizations.
- Explorer:
  - Shows selected active org resources plus public resources from any organization.
- Public access:
  - Anonymous users can read `public` resources only.
  - Anonymous users can never write.

## Public Read Surface (Anonymous)

Anonymous/public internet access is read-only and limited to resources with `visibility = public`.

Allowed:

- List and detail views for public top-level resources.
- Read access to child runs/outputs when parent resource is public.
- Public export/download routes for public resources.

Not allowed:

- Any create/update/delete route.
- Any draft resource route.
- Any org/member/invitation/log-management route.

## Draft and Publishing Behavior

- Draft state exists only for `dashboard` and `report`.
- Member-created dashboards/reports remain drafts until admin publishes.
- All write operations must have an authenticated initiating user (`actorUserId`); no system-only write actor in MVP.
- Members cannot view other users' drafts.
- Admins can view and edit all drafts.
- Published dashboard/report versions are immutable snapshots.
- Any edit to a published dashboard/report creates a new draft revision that requires admin publication.
- Members create draft revisions only from their own dashboards/reports.
- Admins can create draft revisions from any dashboard/report in the org.

## Visibility Transition Matrix

### Dataset / Geometries / Product

| From    | To      | Allowed | Role  |
| ------- | ------- | ------- | ----- |
| private | public  | Yes     | admin |
| public  | private | Yes     | admin |

Rules:

- No `draft` state exists for these resource types.
- Members cannot change visibility.

### Dashboard / Report

| From    | To      | Allowed | Role  |
| ------- | ------- | ------- | ----- |
| draft   | private | Yes     | admin |
| draft   | public  | Yes     | admin |
| private | public  | Yes     | admin |
| public  | private | Yes     | admin |
| private | draft   | No      | n/a   |
| public  | draft   | No      | n/a   |

Rules:

- Member create is always `draft`.
- Admin create defaults to `private`; admin may optionally set `public` at creation.
- Published resources are never edited in place; edits occur via draft revisions.

## Ownership and Removal Rules

- Draft ownership is tracked via `createdByUserId`.
- If a user is removed from an organization:
  - Access is revoked immediately.
  - Their existing resources remain in the organization.
  - Their draft dashboards/reports remain admin-visible/manageable.
  - Creator metadata is preserved for provenance/audit.

## Authorization Rules by Resource Type

| Resource Type   | Visibility States          | Member Create | Member Edit | Member Read            |
| --------------- | -------------------------- | ------------- | ----------- | ---------------------- |
| dataset         | `private`,`public`         | No            | No          | Yes                    |
| dataset_run     | inherited from dataset     | No            | No          | Yes                    |
| geometries      | `private`,`public`         | No            | No          | Yes                    |
| geometries_run  | inherited from geometries  | No            | No          | Yes                    |
| geometry_output | inherited from geometries  | No            | No          | Yes                    |
| product         | `private`,`public`         | No            | No          | Yes                    |
| product_run     | inherited from product     | No            | No          | Yes                    |
| product_output  | inherited from product     | No            | No          | Yes                    |
| dashboard       | `draft`,`private`,`public` | Draft only    | Own drafts  | Non-draft + own drafts |
| report          | `draft`,`private`,`public` | Draft only    | Own drafts  | Non-draft + own drafts |

Notes:

- "Member Read" in app context is subject to active org scope in console and active org + public scope in explorer.
- Public reads are available anonymously regardless of org membership.

## Logging Requirements

### Audit log (write + security events)

Log all of:

- Create/update/delete for all top-level and child resources
- Visibility changes
- Membership/invitation actions (invite, accept, remove, role change)
- Authentication-relevant org context changes (e.g., active org switch)

### Read log (all read events)

Log all read/list/export/download events for all resources, including:

- Authenticated access
- Anonymous public access
- Allowed and denied access attempts

### Minimum log fields

- `eventId`
- `timestamp`
- `actorUserId` (nullable for anonymous)
- `actorRole` (if authenticated)
- `activeOrganizationId` (nullable for anonymous)
- `targetOrganizationId`
- `resourceType`
- `resourceId` (nullable for list/search events)
- `action` (`read`,`list`,`create`,`update`,`delete`,`publish`,`invite`, etc.)
- `decision` (`allow`/`deny`)
- `requestPath`
- `requestMethod`
- `ipAddress` (if available)
- `userAgent` (if available)

### Log visibility

- Org admins can view logs for their organization.

### Log retention and privacy

- Audit log retention: minimum 7 years.
- Read log retention: minimum 13 months.
- Logs must never store credentials/secrets (`password`, session tokens, API keys, auth headers).
- Request metadata should be redacted for sensitive query/body fields before persistence.
- Log access itself must be audited.

## API and Enforcement Requirements

- Backend authorization is the source of truth; frontend checks are convenience only.
- Every protected API endpoint must enforce:
  - Authentication (except explicit public routes)
  - Organization scope rules
  - Role checks
  - Ownership checks (for member draft edit/delete)
  - Visibility checks
- Authorization evaluation must be deny-by-default.
- Public endpoints must enforce read-only behavior.
- Existing global `user.role` can remain for platform-level operations, but resource authorization must be org-scoped in MVP.

## Alignment to Platform Requirements

This model aligns with the project goals by:

- Supporting organization ownership and tiered access control (Technical Requirements 4.2).
- Enabling safe non-technical authoring workflows for dashboards/reports via drafts + admin publishing (Functional 3.3).
- Preserving transparency/defensibility through complete audit/read logging and clear ownership metadata (Objectives 1.1, 1.2; Functional 3.4).
- Remaining API-first and externally consumable for public resources (Objectives 1.4, Technical 4.1/4.5).

## MVP Acceptance Criteria

1. New signup creates a personal org workspace and assigns the creator as org `admin`.
2. All top-level ACL resources require `organizationId`, `createdByUserId`, and valid visibility.
3. `member` cannot create/edit/delete `dataset`, `geometries`, `product`, or their child resources.
4. `member` can create/edit/delete only their own `dashboard/report` drafts.
5. `member` cannot directly edit `private/public` dashboards/reports, even if they created them.
6. `member` cannot publish or change visibility of any resource.
7. `admin` can publish member drafts to `private` or `public`.
8. Console queries are scoped to active org only.
9. Explorer queries include active org resources + public resources from all orgs.
10. Anonymous users can read public resources only.
11. Child resource access always follows parent access.
12. Organization admin floor is enforced (cannot remove/demote last admin).
13. Visibility transitions are enforced exactly per matrix in this document.
14. Migration/backfill is completed with idempotent fallback behavior and reporting.
15. Audit log captures all write/security events listed above.
16. Read log captures all read/list/export/download events (allow + deny) across all resource types.
17. Log retention/privacy requirements are enforced.
18. Public routes reject writes and any access to draft or org-management data.

## Deferred (Post-MVP)

- Per-resource sharing to specific users/orgs.
- Resource-specific role overrides.
- Time-limited/granular sharing links.
- Policy conditions based on geography, indicator, or workflow metadata.
- Additional roles (e.g., reviewer, publisher) beyond `admin` and `member`.
