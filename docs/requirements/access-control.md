# Access Control Requirements (MVP)

## Summary

This document defines the minimum viable access-control model for the Spatial Data Framework platform.

It introduces:

- Multi-tenant organization scoping for all core resources
- Four organization-level roles: `org_admin`, `org_creator`, `org_viewer`, plus a platform-level `super_admin`
- Visibility controls (`private`, `public`, `global`) plus an irreversible publish state for reports
- External visibility dependency validation for products, derived indicators, reports, and dashboards
- Multi-factor authentication (MFA) required for `super_admin` and `org_admin`
- Open signup with email verification (auto-provisioned personal organization as `org_creator`)
- Configurable anonymous public access (can be locked down platform-wide)
- API key support for all authenticated users
- Child resources (`*_run`, outputs) inherit access from parent resources
- Full audit log and full read log coverage

This is designed for implementation using the existing `better-auth` organization plugin.

## Goals

- Enforce organization-scoped tenancy across console and explorer surfaces.
- Provide a tiered role model separating data management (`org_admin`) from reporting (`org_creator`) from read-only access (`org_viewer`).
- Keep visibility authorization simple and predictable, with report publishing treated as a separate editorial lock and PDF generation workflow.
- Ensure data resources require platform-level approval (`super_admin`) before public exposure.
- Support traceability and defensibility with complete access logging.

## Non-Goals (MVP)

- Dashboard draft/publish workflow and multi-step editorial review for reports.
- Per-resource sharing with specific users or external organizations (cross-org sharing at view/edit levels acknowledged but not necessary at this point).
- Organization feature flags (deferred unless necessary).
- Independent ACLs on run/output child resources.
- Fine-grained field-level or row-level policy controls.
- Complex policy engines (ABAC/ReBAC) beyond role + visibility + ownership checks.

## Terms

- **Organization**: Tenant boundary for private resources. All resources must belong to an organization.
- **Active Organization**: Organization currently selected in the app context.
- **Top-level ACL resource**: Resource with explicit `organizationId`, owner, and visibility.
- **Child resource**: Resource whose access is inherited from a top-level parent.
- **Public resource**: Internet-readable resource (`visibility = public`), read-only for all non-admin users, but not cross-org listed.
- **Globally public**: Internet-readable resource (`visibility = global`) that is also listed across all organizations and in the public explorer.
- **Published report**: Report with generated PDF metadata that is permanently locked against further changes.

## Resource Model

### Top-level ACL resources

- `dataset`
- `geometries`
- `product`
- `indicatorCategory`
- `indicator`
- `derivedIndicator`
- `dashboard`
- `report`

Each top-level ACL resource must include:

- `organizationId` (required)
- `createdByUserId` (required)
- `visibility` (enum: `private`, `public`, `global`)

### Child resources (inherited access; no independent ACL)

- `dataset_run` inherits from `dataset`
- `geometries_run` and `geometry_output` inherit from `geometries`
- `product_run` and `product_output` inherit from `product`

Child resources must not have their own visibility/ACL fields in MVP.

## Visibility Model

### All resource types

- `private`: visible to members of the owning organization only
- `public`: directly readable by anyone (read-only); anonymous access subject to platform configuration
- `global`: directly readable by anyone and listed across all organizations and in the public explorer

All resources within an organization are visible to all org members regardless of role.

Reports additionally have a separate editorial lifecycle:

- `draft`: editable and publishable
- `published`: immutable, downloadable as PDF, and never unlockable

Publishing does not change visibility. A report may remain `private`, `public`, or `global` before and after publish.

### Inheritance Rule

Child resource visibility is always equal to parent effective visibility.

Examples:

- If a `product` is `private`, all `product_run` and `product_output` are `private`.
- If a `dataset` is `public`, all `dataset_run` are `public`.

### External Visibility Dependency Validation

`public` and `global` are treated the same for dependency validation. A dependency is valid if it is not `private`.

- A `product` cannot be made `public` or `global` unless its `dataset`, `geometries`, and all measured or derived indicators referenced by its main-run output summary are already `public` or `global`.
- A `product` also requires a `mainRun` with an output summary before it can be made `public` or `global`.
- A `derivedIndicator` cannot be made `public` or `global` unless all of its measured-indicator dependencies are already `public` or `global`.
- An `indicatorCategory` remains a normal top-level ACL resource, but it does not participate in external visibility dependency validation.
- A `report` or `dashboard` cannot be made `public` or `global` unless all referenced products, datasets, geometries, indicators, and derived indicators are already `public` or `global`.
- If any upstream dependency is `private`, the request must fail with an error identifying the same-organization private dependencies.
- The UI should warn before any visibility change and provide links to same-organization dependencies or dependents that need follow-up updates.
- Making an upstream dependency `private` should warn about externally visible dependents, but it does not block the change.

## Role Model

### Platform-Level: `super_admin`

Internal platform operators. Not scoped to a single organization.

- Can make any top-level resource `global` (visible across all organizations).
- Full read/write on all resources across all organizations.
- Required to use MFA.

### Organization-Level Roles

Roles are scoped to a specific organization. Users may hold different roles in different organizations.

#### `org_admin`

- Full read/write on all resources in the organization.
- Can create/edit/delete `dataset`, `geometries`, `product`, `indicatorCategory`, `indicator`, `derivedIndicator`, `dashboard`, `report`.
- Can publish any draft report in the organization.
- Can change resource visibility between `private` and `public` (subject to dependency validation where applicable).
- Cannot move a resource into or out of `global` (requires `super_admin`).
- Can invite/remove users and assign organization roles.
- Can view organization audit logs.
- Required to use MFA.

#### `org_creator`

- Can create `dashboard` and `report` in the organization.
- Can edit/delete only the `dashboard` and `report` resources they created.
- Can publish only the reports they created.
- Read access to all resources in the active organization.
- Cannot create/edit/delete `dataset`, `geometries`, `product`, `indicatorCategory`, `indicator`, `derivedIndicator`, or their child resources.
- Cannot change visibility of any resource.
- Cannot invite/remove users or change organization roles.

#### `org_viewer`

- Read access to all `private` resources in the organization (including reports, dashboards, and their provenance).
- Cannot create, edit, or delete any resources.
- Cannot publish reports.
- Cannot change visibility of any resources.
- Cannot invite/remove users or change organization roles.

### Role Hierarchy

`super_admin` > `org_admin` > `org_creator` > `org_viewer` > public (unauthenticated)

Each role includes all permissions of lower roles within its scope.

## Authentication

### Open Signup

- Users can sign up with email verification.
- On signup, a personal organization is created automatically (e.g., `"<Name>'s Workspace"`).
- The signup user is assigned `org_creator` in their personal organization.
- Signup users cannot invite other users (invitation requires `org_admin`).

### Multi-Factor Authentication (MFA)

MFA is required for `super_admin` and `org_admin` roles.

Supported MFA methods:

- TOTP (authenticator app)
- Email one-time password (OTP)
- Backup codes

MFA enrollment must be enforced before these roles can perform protected operations.

### API Keys

- Any authenticated user can create API keys.
- API keys inherit the user's role and organization scope.
- API key management (create, revoke, list) is available to all authenticated users.

## Organization and Membership Rules

- All resources must belong to an organization.
- Every user must belong to at least one organization.
- On signup, a personal organization is created and the user is assigned `org_creator`.
- Users may belong to multiple organizations.
- Selected active organization controls tenant scope for authenticated app behavior.
- Only `org_admin` can invite users to an organization.
- Invitations default to `org_viewer`; `org_admin` may explicitly invite as `org_creator` or `org_admin`.
- Only `org_admin` can change a user's role within the organization.
- An organization must always have at least one `org_admin`.
- The last remaining org admin cannot:
  - demote themselves
  - remove themselves
  - leave the organization
- Removing or demoting an admin is allowed only if at least one other `org_admin` remains.

## Console vs Explorer Scope

- **Console**:
  - Lists resources scoped to the selected active organization plus `global` resources from other organizations.
  - Includes private resources for the active organization (subject to role rules).
- **Explorer**:
  - Lists selected active organization resources plus `global` resources from any organization.
- **Public access**:
  - Anonymous users can list `global` resources only (when anonymous access is enabled).
  - Any authenticated user can directly read `public` or `global` resources regardless of organization membership.
  - Anonymous users can never write.

## Public Access

### Configurable Anonymous Access

Anonymous (unauthenticated) access to public resources is configurable at the platform level.

- When enabled: public resources are accessible without login.
- When disabled: all access requires authentication (public resources are still visible to any authenticated user regardless of organization membership).
- Default configuration should be determined at deployment.

### Public Read Surface

Anonymous/public internet access is read-only and uses the same resource endpoints as authenticated reads.

MVP does not require dedicated public-only routes or layouts. Public detail reads may reuse the standard resource pages and endpoints as long as anonymous access remains read-only and private resources stay protected.

Allowed:

- List views for `global` top-level resources only.
- Detail views for `public` and `global` top-level resources.
- Read access to child runs/outputs when parent resource is `public` or `global`.
- Read access to provenance of `public`/`global` reports and dashboards.
- Standard export/download routes for `public` and `global` resources.

Not allowed:

- Any create/update/delete route.
- Any organization/member/invitation/log-management route.
- Access to private resources.

## Visibility Transition Matrix

| From    | To      | Allowed | Required Role |
| ------- | ------- | ------- | ------------- |
| private | public  | Yes     | `org_admin`   |
| public  | private | Yes     | `org_admin`   |
| private | global  | Yes     | `super_admin` |
| public  | global  | Yes     | `super_admin` |
| global  | public  | Yes     | `super_admin` |
| global  | private | Yes     | `super_admin` |

Rules:

- Entering or leaving `global` requires `super_admin`.
- Making a `product`, `derivedIndicator`, `report`, or `dashboard` externally visible requires dependency validation.
- Making a `dataset`, `geometries`, `indicator`, `derivedIndicator`, or `product` private should warn if externally visible dependents exist.
- Cross-organization warnings must not expose dependent names or IDs; only counts by resource type may be shown.
- `org_viewer` cannot change visibility of any resource.

## Ownership and Removal Rules

- Resource ownership is tracked via `createdByUserId`.
- If a user is removed from an organization:
  - Access is revoked immediately.
  - Their existing resources remain in the organization.
  - Creator metadata is preserved for provenance/audit.

## Authorization Rules by Resource Type

| Resource Type     | Visibility States             | org_viewer | org_creator                     | org_admin               |
| ----------------- | ----------------------------- | ---------- | ------------------------------- | ----------------------- |
| dataset           | `private`, `public`, `global` | Read       | Read                            | Create/Edit/Delete/Read |
| dataset_run       | inherited from dataset        | Read       | Read                            | Create/Edit/Delete/Read |
| geometries        | `private`, `public`, `global` | Read       | Read                            | Create/Edit/Delete/Read |
| geometries_run    | inherited                     | Read       | Read                            | Create/Edit/Delete/Read |
| geometry_output   | inherited                     | Read       | Read                            | Create/Edit/Delete/Read |
| product           | `private`, `public`, `global` | Read       | Read                            | Create/Edit/Delete/Read |
| product_run       | inherited from product        | Read       | Read                            | Create/Edit/Delete/Read |
| product_output    | inherited from product        | Read       | Read                            | Create/Edit/Delete/Read |
| indicatorCategory | `private`, `public`, `global` | Read       | Read                            | Create/Edit/Delete/Read |
| indicator         | `private`, `public`, `global` | Read       | Read                            | Create/Edit/Delete/Read |
| derivedIndicator  | `private`, `public`, `global` | Read       | Read                            | Create/Edit/Delete/Read |
| dashboard         | `private`, `public`, `global` | Read       | Create/Own Edit/Own Delete/Read | Create/Edit/Delete/Read |
| report            | `private`, `public`, `global` | Read       | Create/Own Edit/Own Delete/Read | Create/Edit/Delete/Read |

Notes:

- `super_admin` has full access to all resources across all organizations.
- "Read" in app context is subject to active org scope in console, direct `public`/`global` detail access, and `global` listing rules in explorer/public views.
- Public reads are available anonymously (when enabled) only for `global` listing routes and `public`/`global` detail routes.
- Visibility changes follow the transition matrix above (not shown in this table).
- Reports are draft-editable only. Once published, edit/delete/visibility change/unpublish are no longer allowed.
- Report publish permission follows report write permission: `org_creator` may publish own reports and `org_admin` may publish any report in the org.

## Logging Requirements

### Audit log (write + security events)

Log all of:

- Create/update/delete for all top-level and child resources
- Visibility changes
- Membership/invitation actions (invite, accept, remove, role change)
- Authentication events (login, MFA challenge, API key creation/revocation)
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
- `action` (`read`, `list`, `create`, `update`, `delete`, `publish`, `invite`, etc.)
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
  - Authentication (except standard read endpoints serving `public`/`global` resources when anonymous access is enabled)
  - Organization scope rules
  - Role checks (four-tier: `super_admin`, `org_admin`, `org_creator`, `org_viewer`)
  - Ownership checks (for `org_creator` edit/delete of own resources)
  - Visibility checks
  - Report publish immutability checks where applicable
  - Dependency validation (for externally visible products, derived indicators, dashboards, and reports)
- Authorization evaluation must be deny-by-default.
- Standard resource endpoints must enforce read-only behavior for anonymous access.
- Published report PDF downloads must use the same read authorization as report detail access.
- MFA must be enforced for `super_admin` and `org_admin` before protected operations.
- Existing global `user.role` can remain for platform-level operations (`super_admin`), but resource authorization must be org-scoped in MVP.

## Alignment to Platform Requirements

This model aligns with the project goals by:

- Supporting organization ownership and tiered access control (Technical Requirements 4.2).
- Providing clear separation between data management and reporting roles (Functional 3.3).
- Preserving transparency/defensibility through complete audit/read logging and clear ownership metadata (Objectives 1.1, 1.2; Functional 3.4).
- Remaining API-first and externally consumable for public resources (Objectives 1.4, Technical 4.1/4.5).

## Migration and Backfill (Existing Data)

For resources created before org ACL fields exist, migration must:

- Backfill all top-level ACL resources with `organizationId`, `createdByUserId`, and `visibility`.
- Assign resources with missing org ownership to a configured bootstrap org (`default-organization` in current environments).
- Assign missing `createdByUserId` to a configured bootstrap admin user (current seeded super-admin) when no reliable actor exists.
- Set default visibility on migrated records to `private`.
- Keep child resource access inherited from parent after migration (no child ACL backfill columns).
- Run idempotently and produce a migration report with counts by resource type and fallback assignments.

## MVP Acceptance Criteria

1. New signup creates a personal org workspace with email verification and assigns the creator as `org_creator`.
2. All top-level ACL resources require `organizationId`, `createdByUserId`, and valid visibility (`private`/`public`/`global`).
3. `org_viewer` cannot create, edit, or delete any resources.
4. `org_creator` can create `dashboard` and `report`, and can edit/delete only their own dashboards and reports.
5. `org_creator` cannot change visibility of any resource.
6. `org_creator` cannot create/edit/delete `dataset`, `geometries`, `product`, `indicatorCategory`, `indicator`, `derivedIndicator`, or their child resources.
7. `org_admin` can create/edit/delete all resource types within their organization.
8. `org_admin` can invite/remove users and change roles within their organization.
9. Only `super_admin` can move a resource into or out of `global`.
10. Making a `product`, `derivedIndicator`, `dashboard`, or `report` externally visible fails if any required upstream dependency is `private`, with clear error messaging.
11. Draft report publishing is allowed only for users who can write that report.
12. Published reports reject update, delete, visibility-change, and re-publish requests.
13. Published report PDF downloads use the same read authorization as report detail access.
14. MFA is enforced for `super_admin` and `org_admin`.
15. Console list queries are scoped to the active org plus `global` resources.
16. Explorer list queries include active org resources + `global` resources from all orgs.
17. Anonymous users can list `global` resources and read `public`/`global` details only (when anonymous access is enabled).
18. Anonymous access is configurable at the platform level.
19. Child resource access always follows parent access.
20. Organization admin floor is enforced (cannot remove/demote last admin).
21. Visibility transitions are enforced exactly per matrix in this document.
22. Making an upstream dependency private returns a warning about externally visible dependents but does not block the change.
23. Product external visibility requires a main run with an output summary.
24. Any authenticated user can create and manage their own API keys.
25. Migration/backfill is completed with idempotent fallback behavior and reporting.
26. Audit log captures all write/security/authentication events listed above.
27. Read log captures all read/list/export/download events (allow + deny) across all resource types.
28. Log retention/privacy requirements are enforced.
29. Standard resource routes reject anonymous writes and any access to org-management data.

## Deferred (Post-MVP)

- Dashboard publish workflow and multi-step editorial review before report publish.
- Per-resource sharing to specific users/orgs (cross-org sharing at view/edit levels).
- Resource-specific role overrides.
- Time-limited/granular sharing links.
- Policy conditions based on geography, indicator, or workflow metadata.
- Organization feature flags.
- Additional roles (e.g., reviewer, publisher) beyond the current four.
