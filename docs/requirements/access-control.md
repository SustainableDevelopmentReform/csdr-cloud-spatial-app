# Access Control Requirements (MVP)

## Summary

This document defines the minimum viable access-control model for the CSDR Cloud Spatial Platform.

It introduces:

- Multi-tenant organization scoping for all core resources
- Four organization-level roles: `org_admin`, `org_creator`, `org_viewer`, plus a platform-level `super_admin`
- Visibility controls (`private`, `public`) with no draft state in MVP
- Public dependency validation: reports/dashboards cannot be made public unless their dependencies (datasets, geometries, products) are already public
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
- Keep v1 authorization simple and predictable — no draft/publish workflow in MVP.
- Ensure data resources require platform-level approval (`super_admin`) before public exposure.
- Support traceability and defensibility with complete access logging.

## Non-Goals (MVP)

- Draft/publish workflow for dashboards and reports (deferred — orgs won't have many users, so all resources are visible to all org members).
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
- **Public resource**: Internet-readable resource (`visibility = public`), read-only for all non-admin users.
- **Globally public**: A resource made public by a `super_admin`, visible across all organizations and (if anonymous access is enabled) to the public internet.

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
- `visibility` (enum: `private`, `public`)

### Child resources (inherited access; no independent ACL)

- `dataset_run` inherits from `dataset`
- `geometries_run` and `geometry_output` inherit from `geometries`
- `product_run` and `product_output` inherit from `product`

Child resources must not have their own visibility/ACL fields in MVP.

## Visibility Model

### All resource types

- `private`: visible to members of the owning organization only
- `public`: visible to anyone (read-only); anonymous access subject to platform configuration

There is no `draft` state in MVP. All resources within an organization are visible to all org members regardless of role.

### Inheritance Rule

Child resource visibility is always equal to parent effective visibility.

Examples:

- If a `product` is `private`, all `product_run` and `product_output` are `private`.
- If a `dataset` is `public`, all `dataset_run` are `public`.

### Public Dependency Validation

A `report` or `dashboard` cannot be made `public` unless all of its dependencies (referenced datasets, geometries, products) are already `public`.

- The system must validate dependency visibility at the time of a publish-to-public request.
- If any dependency is `private`, the request must fail with an error identifying the non-public dependencies.
- The user should be warned about required dependency visibility changes before proceeding.

## Role Model

### Platform-Level: `super_admin`

Internal platform operators. Not scoped to a single organization.

- Can make `dataset`, `geometries`, and `product` resources globally public (visible across all organizations).
- Full read/write on all resources across all organizations.
- Required to use MFA.

### Organization-Level Roles

Roles are scoped to a specific organization. Users may hold different roles in different organizations.

#### `org_admin`

- Full read/write on all resources in the organization.
- Can create/edit/delete `dataset`, `geometries`, `product`, `dashboard`, `report`.
- Can change visibility of `dashboard` and `report` to `public` (subject to dependency validation).
- Cannot make `dataset`, `geometries`, or `product` public (requires `super_admin`).
- Can invite/remove users and assign organization roles.
- Can view organization audit/read logs.
- Required to use MFA.

#### `org_creator`

- Can create/edit/delete `dashboard` and `report` in the organization.
- Can change visibility of their own `dashboard` and `report` to `public` (subject to dependency validation).
- Read access to all resources in the active organization.
- Cannot create/edit/delete `dataset`, `geometries`, `product`, or their child resources.
- Cannot change visibility of `dataset`, `geometries`, or `product`.
- Cannot invite/remove users or change organization roles.

#### `org_viewer`

- Read access to all `private` resources in the organization (including reports, dashboards, and their provenance).
- Cannot create, edit, or delete any resources.
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
  - Shows resources scoped to the selected active organization only.
  - Includes private resources for that organization (subject to role rules).
  - Does not browse private resources from other organizations.
- **Explorer**:
  - Shows selected active organization resources plus public resources from any organization.
- **Public access**:
  - Anonymous users can read `public` resources only (when anonymous access is enabled).
  - Anonymous users can never write.

## Public Access

### Configurable Anonymous Access

Anonymous (unauthenticated) access to public resources is configurable at the platform level.

- When enabled: public resources are accessible without login.
- When disabled: all access requires authentication (public resources are still visible to any authenticated user regardless of organization membership).
- Default configuration should be determined at deployment.

### Public Read Surface

Anonymous/public internet access is read-only and limited to resources with `visibility = public`.

Allowed:

- List and detail views for public top-level resources.
- Read access to child runs/outputs when parent resource is public.
- Read access to provenance of public reports/dashboards.
- Public export/download routes for public resources.

Not allowed:

- Any create/update/delete route.
- Any organization/member/invitation/log-management route.
- Access to private resources.

## Visibility Transition Matrix

| From    | To      | Allowed | Required Role                                                                                                                |
| ------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| private | public  | Yes     | `super_admin` for `dataset`, `geometries`, `product`; `org_admin` or `org_creator` (own resources) for `dashboard`, `report` |
| public  | private | Yes     | `super_admin` for `dataset`, `geometries`, `product`; `org_admin` for `dashboard`, `report`                                  |

Rules:

- Making `dataset`, `geometries`, or `product` public requires `super_admin`.
- Making `dashboard` or `report` public requires dependency validation (all referenced datasets, geometries, products must already be public).
- `org_creator` can make their own `dashboard/report` public; `org_admin` can make any org `dashboard/report` public.
- Revoking public status on a `dataset`, `geometries`, or `product` should warn if any public `dashboard/report` depends on it.
- `org_viewer` cannot change visibility of any resource.

## Ownership and Removal Rules

- Resource ownership is tracked via `createdByUserId`.
- If a user is removed from an organization:
  - Access is revoked immediately.
  - Their existing resources remain in the organization.
  - Creator metadata is preserved for provenance/audit.

## Authorization Rules by Resource Type

| Resource Type   | Visibility States      | org_viewer | org_creator             | org_admin               |
| --------------- | ---------------------- | ---------- | ----------------------- | ----------------------- |
| dataset         | `private`, `public`    | Read       | Read                    | Create/Edit/Delete/Read |
| dataset_run     | inherited from dataset | Read       | Read                    | Create/Edit/Delete/Read |
| geometries      | `private`, `public`    | Read       | Read                    | Create/Edit/Delete/Read |
| geometries_run  | inherited              | Read       | Read                    | Create/Edit/Delete/Read |
| geometry_output | inherited              | Read       | Read                    | Create/Edit/Delete/Read |
| product         | `private`, `public`    | Read       | Read                    | Create/Edit/Delete/Read |
| product_run     | inherited from product | Read       | Read                    | Create/Edit/Delete/Read |
| product_output  | inherited from product | Read       | Read                    | Create/Edit/Delete/Read |
| dashboard       | `private`, `public`    | Read       | Create/Edit/Delete/Read | Create/Edit/Delete/Read |
| report          | `private`, `public`    | Read       | Create/Edit/Delete/Read | Create/Edit/Delete/Read |

Notes:

- `super_admin` has full access to all resources across all organizations.
- "Read" in app context is subject to active org scope in console and active org + public scope in explorer.
- Public reads are available anonymously (when enabled) regardless of organization membership.
- Visibility changes follow the transition matrix above (not shown in this table).

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
  - Authentication (except explicit public routes, when anonymous access is enabled)
  - Organization scope rules
  - Role checks (four-tier: `super_admin`, `org_admin`, `org_creator`, `org_viewer`)
  - Ownership checks (for `org_creator` edit/delete of own resources)
  - Visibility checks
  - Dependency validation (for publish-to-public of dashboards/reports)
- Authorization evaluation must be deny-by-default.
- Public endpoints must enforce read-only behavior.
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
2. All top-level ACL resources require `organizationId`, `createdByUserId`, and valid visibility (`private`/`public`).
3. `org_viewer` cannot create, edit, or delete any resources.
4. `org_creator` can create/edit/delete only `dashboard` and `report`.
5. `org_creator` can make their own `dashboard/report` public (subject to dependency validation).
6. `org_creator` cannot create/edit/delete `dataset`, `geometries`, `product`, or their child resources.
7. `org_admin` can create/edit/delete all resource types within their organization.
8. `org_admin` can invite/remove users and change roles within their organization.
9. Only `super_admin` can make `dataset`, `geometries`, or `product` public.
10. Publishing a `dashboard/report` as public fails if any dependency is not public, with clear error messaging.
11. MFA is enforced for `super_admin` and `org_admin`.
12. Console queries are scoped to active org only.
13. Explorer queries include active org resources + public resources from all orgs.
14. Anonymous users can read public resources only (when anonymous access is enabled).
15. Anonymous access is configurable at the platform level.
16. Child resource access always follows parent access.
17. Organization admin floor is enforced (cannot remove/demote last admin).
18. Visibility transitions are enforced exactly per matrix in this document.
19. Any authenticated user can create and manage their own API keys.
20. Migration/backfill is completed with idempotent fallback behavior and reporting.
21. Audit log captures all write/security/authentication events listed above.
22. Read log captures all read/list/export/download events (allow + deny) across all resource types.
23. Log retention/privacy requirements are enforced.
24. Public routes reject writes and any access to org-management data.

## Deferred (Post-MVP)

- Draft/publish workflow for dashboards and reports (editorial review before org-wide visibility).
- Per-resource sharing to specific users/orgs (cross-org sharing at view/edit levels).
- Resource-specific role overrides.
- Time-limited/granular sharing links.
- Policy conditions based on geography, indicator, or workflow metadata.
- Organization feature flags.
- Additional roles (e.g., reviewer, publisher) beyond the current four.
