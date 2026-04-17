# Charting, Reports & Dashboards

This document describes the charting system used in reports and dashboards.

---

## Core Principle: One-to-One Data Mapping

Every visual element in a chart (dot, bar, line point, donut slice, table cell, map polygon, KPI value) corresponds to exactly one product output. No aggregation, summarisation, or overwriting is ever performed. If a collision is detected, the system shows an error — values are never silently dropped or combined.

### Dimension Rules by Chart Type

| Chart type                           | Varying dimensions                                | Fixed dimensions                                       |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------ |
| Cartesian (line, area, bar, scatter) | At most 2 (time as x-axis + one series dimension) | Remaining dimension must be a single value             |
| Single-x (donut, ranked bar)         | Exactly 1 (the series dimension)                  | Other two must each be a single value                  |
| Table                                | 2 (one for columns, one for rows)                 | Third dimension must be a single value                 |
| Map                                  | Geometry (spatial)                                | Single indicator + single time point                   |
| KPI card                             | None                                              | Single indicator + single geometry + single time point |

---

## Chart Types

### Plot Charts

| Type         | Description                        | Requires multiple time points |
| ------------ | ---------------------------------- | ----------------------------- |
| Line         | Trends over time                   | Yes                           |
| Area         | Filled trends                      | Yes                           |
| Stacked Area | Part-to-whole over time            | Yes                           |
| Stacked Bar  | Totals by category                 | Yes                           |
| Grouped Bar  | Side-by-side comparison            | No                            |
| Ranked Bar   | Sorted horizontal bars with labels | No                            |
| Scatter      | Value distribution                 | Yes                           |
| Donut        | Proportions                        | No                            |

### Other Types

| Type     | Description                                                               |
| -------- | ------------------------------------------------------------------------- |
| Table    | Colour-coded grid with configurable row and column axes                   |
| Map      | Spatial choropleth with legend                                            |
| KPI Card | Single highlighted numeric value with context (indicator, geometry, time) |

---

## Configuration Wizard

The chart creation and editing wizard has four steps:

| Step | Label       | Description                                              |
| ---- | ----------- | -------------------------------------------------------- |
| 0    | Data Source | Select a product and product run                         |
| 1    | Chart Type  | Choose a visualisation type from a grid of options       |
| 2    | Configure   | Data selections, series dimension, title and description |
| 3    | Appearance  | Colours, axes, formatting                                |

### Step 0 — Data Source

- Optional indicator filter to narrow the product list
- Product selector (only shows products with at least one run)
- Product run selector

### Step 1 — Chart Type

- Grid of chart type cards with icons and descriptions
- Types requiring multiple time points are disabled when the product has only one

### Step 2 — Configure

- **Plot charts**: Series dimension toggle (Compare by / Slice by) for indicators, geometries, or time. Dimensions with only one item are automatically disabled.
- **Table charts**: Column axis and row axis dimension selectors
- **Map / KPI charts**: Single-select controls for indicator, geometry, and time
- **All types**: Title and description fields. Title is auto-generated from selections.
- Series count warning when more than 8 series are selected
- Live preview on the right side of the dialog

### Step 3 — Appearance

- Colour scheme selection (categorical palettes for plots, sequential/diverging for table and map)
- Per-series colour overrides via hex input
- Chart-type-specific options (curve type, dots, fill opacity, bar radius, donut inner radius, etc.)
- Formatting controls (decimal places, compact numbers, date precision)
- Map-specific options (outlines, bounding box from map extent)

---

## Appearance Options

### Colour Schemes

- **Categorical** (plot charts): Tableau 10, Category 10, Paired, Set 1/2/3, Dark 2, Accent, Observable 10
- **Sequential** (table, map): Yellow-Orange-Red, Viridis, Plasma, Inferno, Blues, Greens, Oranges, Yellow-Green-Blue, Blue-Purple
- **Diverging** (table, map): Red-Blue, Brown-Blue-Green, Pink-Yellow-Green, Purple-Green, Red-Yellow-Green

### Per-Series Colour Overrides

Each series can be individually overridden with a hex colour value.

### Continuous Colour Scale (table, map)

- Scale type: sequential or diverging
- Manual min/max bounds
- Midpoint value for diverging scales
- Reverse scale direction toggle

### Axes and Grid

- Include zero on y-axis
- Manual y-axis range (min/max)
- Grid lines toggle
- Legend position: top, bottom, or hidden

### Line / Area Options

- Curve type: monotone, linear, or step (default: linear)
- Show data point dots
- Area fill opacity

### Bar Options

- Corner radius

### Donut Options

- Inner radius (percentage, default 50%)

### Map Options

- Show geometry outlines
- Bounding box (settable from current map viewport)

### Formatting

- Decimal places (0–6)
- Compact notation (1.2k, 3.4M) — on by default
- Date precision: year, year-month, year-month-day, or full

---

## Validation Rules

### Limits

- Max recommended series: 8 (warning shown beyond this)
- Max selectable indicators: 100
- Max selectable geometry outputs: 100
- Max map geometry outputs: 10

### Plot Charts

- **Donut / Ranked bar**: at most one dimension can vary; the others must each be a single value
- **Cartesian charts**: at most two dimensions can vary (time + one series). If both indicators and geometries are set to vary, an error is shown.

### Table Charts

- Dimensions used as table axes can have multiple values; the unused dimension must be a single value

### Map Charts

- Exactly one indicator and one time point required
- Geometry outputs are optional (for zoom filtering, max 10)

### KPI Cards

- Exactly one indicator, one time point, and one geometry output required
- If the query returns no results: empty state message
- If the query returns more than one result: hard error (no aggregation)

---

## Dashboard Grid

- 12-column grid layout
- Row height: 40px
- Default chart tile: 4 columns wide, 12 rows tall
- Features: drag-to-reposition, resize, duplicate, delete
- Orphaned layouts are automatically cleaned up on every change

---

## Report Integration

Charts are embedded in rich-text reports as custom blocks:

- Each chart block stores its configuration and a persisted height
- Minimum height: 120px; default: 384px
- Height is adjustable via a drag handle on the bottom-right corner
- Title and description are shown above the chart
- In draft reports, the edit button opens the same wizard dialog used in dashboards
- In published reports and PDF renders, chart blocks are read-only and hide edit/resize controls

## Published Report Rendering

- Published reports reuse the same rich-text chart blocks as draft reports, but in read-only mode
- The shared sources component is rendered after report content in both the console report view and the print/PDF view
- Sources are grouped as `Products`, `Datasets`, and `Geometries`
- Published PDFs are generated from the dedicated print route, not from a separate charting export format
- The final PDF includes a QR code page linking back to the live report URL

---

## Selection Behaviour

Clicking a chart element (bar, dot, slice, map polygon, KPI card, table cell) opens a floating product output summary card showing:

- Product output details
- Dependencies (product, product run)
- Link to the full output detail page

The card position accounts for scroll offset and flips above/below or left/right based on viewport position.

---

## Unimplemented Features

### New Chart Types / Modes

1. **Comparison / Change-Over-Time Summaries** — percentage change between two time points for all indicators
2. **Sparklines / Small Multiples** — one mini chart per geometry or indicator, tiled in a grid
3. **Indicator vs Indicator Scatter** — plotting one indicator against another where each point is a geometry
4. **KPI Delta Display** — optional comparison time point for showing change/trend on KPI cards

### Appearance Options (Deferred)

5. **100% Stacked Normalisation** — normalising stacked area/bar to percentages
6. **Logarithmic Scale** — deferred due to data misrepresentation risk
7. **Annotations / Reference Lines**
8. **Stack Order** — controlling series order in stacked charts
9. **Stroke Style** — solid, dashed, or dotted for line charts
10. **Dot Shape and Size** — circle, square, diamond, or triangle for scatter charts
11. **Donut Labels** — showing value/name/percentage directly on slices

### Infrastructure / UX

12. **Observable Plot Integration** — shell exists for advanced users to write custom Observable plots
