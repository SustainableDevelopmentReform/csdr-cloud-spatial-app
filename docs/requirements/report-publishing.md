# Report Publishing

This document defines how reports move from editable drafts to fixed published outputs.

## Summary

- Reports begin as drafts
- Publishing locks a report permanently
- Publishing creates a PDF copy of the report
- The report and the PDF both show a sources section
- Published reports are revised by duplicating them into new drafts

## Goals

- Provide a stable published version of a report
- Prevent accidental changes after publication
- Make it easy to download and share a fixed PDF version
- Keep source provenance visible in both the web app and the PDF
- Keep the editing workflow simple

## Non-Goals

- Unpublishing or unlocking a report
- Approval workflows or reviewer stages
- Publishing dashboards
- Maintaining multiple published versions of the same report

## Report States

### Draft

- A draft report can be edited
- A draft report can be deleted
- A draft report can be duplicated
- A draft report can be published

### Published

- A published report is read-only
- A published report cannot be unlocked
- A published report cannot be deleted
- A published report cannot be published again
- A published report can still be duplicated

## Publishing Rules

- Publishing is irreversible
- Publishing must use the saved version of the report, not unsaved changes in the browser
- Publishing must generate a PDF as part of the same action
- A report must not be marked as published unless its PDF has been created successfully
- Publishing does not change report visibility

## Published PDF

- Publishing creates a server-generated PDF
- The PDF is stored in private object storage
- The PDF can be downloaded by anyone who is allowed to read the report
- Unpublished reports do not have a downloadable PDF

## PDF Content

- The PDF should render the report content in read-only form
- The PDF should not include editing controls or console-only UI
- The PDF should include the sources section
- The PDF should end with a QR code linking to the live report

## Sources

The sources section should be shown in both the web report and the PDF.

### Source content

The sources list should include:

- products used by the report
- datasets behind those products
- geometries behind those products
- source products used through derived-indicator dependencies

### Source presentation

- Sources should be derived from existing chart usage, not stored separately
- Sources should be deduplicated
- Sources should be grouped as `Products`, `Datasets`, and `Geometries`
- Each source should show:
  - name
  - description
  - created date
  - link to the resource

## Duplicate

### Reports

Duplicating a report creates a new editable draft:

- in the caller's active organization
- owned by the caller
- with private visibility
- with copied content
- with publish state cleared
- with ` (Copy)` appended to the name

### Dashboards

Dashboards should support the same duplicate workflow:

- create a new editable copy
- place it in the caller's active organization
- reset it to private visibility
- append ` (Copy)` to the name

## Permissions

- A user may publish a report only if they are allowed to edit that report
- A published report remains readable under the same read rules as any other report
- Downloading the PDF follows the same read rules as viewing the report

## Acceptance Criteria

1. Draft reports can be edited and published.
2. Publishing locks the report permanently.
3. Publishing creates a PDF.
4. A published report cannot be edited, deleted, or unpublished.
5. The web report and the PDF both show the same sources section.
6. Sources are deduplicated and grouped clearly.
7. Users who can read a published report can download its PDF.
8. Duplicating a published report creates a new editable draft copy.
