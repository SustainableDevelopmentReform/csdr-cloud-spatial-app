# CSDR Cloud Spatial Data Model

Simplified data model diagram - see [`schema.ts`](../apps/server/src/schemas/index.ts) for the full schema.

```mermaid
erDiagram
    dataset {
        text id PK "e.g., 'gmw-annual-extent'"
        text name "e.g., 'Global Mangrove Watch Annual Extent'"
    }

    geometries {
        text id PK "e.g., 'asgs-ste-2021'"
        text name "e.g., 'Australian States and Territories 2021'"
    }

    product {
        text id PK "e.g., 'gmw-aus-states'"
        text name "e.g., 'Mangrove Coverage by Australian State'"
    }

    dataset_run {
        text id PK
        text description "e.g., 'GMW 2020 processed to 1km Mollweide'"
        jsonb parameters "targetCrs, resolution, resamplingMethod"
    }

    geometries_run {
        text id PK
        text description "e.g., 'ASGS STE converted to GeoParquet'"
        jsonb parameters "nameProperty: 'STE_NAME21'"
    }

    product_run {
        text id PK
        text description "e.g., 'Mangrove stats 2020 for all states'"
        jsonb parameters "fillValue: 0"
    }

    geometry_output {
        text id PK
        text geometries_run_id FK
        text name "e.g., 'Tasmania', 'Queensland'"
        jsonb properties "e.g., {STE_CODE21: '6', AREASQKM21: 68401}"
        jsonb geometry "GeoJSON polygon"
    }

    product_output {
        text id PK
        text product_run_id FK
        text geometry_output_id FK
        text variable_id FK "e.g., 'mangrove_total_area'"
        numeric value "e.g., 12543.75"
    }

    variable_category {
        text id PK "e.g., 'ecology', 'coverage'"
        text name "e.g., 'Ecology', 'Coverage Metrics'"
    }

    variable {
        text id PK "e.g., 'mangrove_total_area'"
        text name "e.g., 'Mangrove Total Area'"
        text unit "e.g., 'm²', '%'"
    }

    dataset ||--o{ dataset_run : "has runs"
    dataset ||--o{ product : "has products"

    geometries ||--o{ geometries_run : "has runs"
    geometries ||--o{ product : "has products"

    product ||--o{ product_run : "has runs"

    dataset_run ||--o{ product_run : "used in"
    geometries_run ||--o{ product_run : "used in"

    geometries_run ||--o{ geometry_output : "produces"

    product_run ||--o{ product_output : "produces"
    geometry_output ||--o{ product_output : "referenced by"

    variable_category ||--o{ variable_category : "parent of"
    variable_category ||--o{ variable : "contains"

    variable ||--o{ product_output : "measured in"
```

## Model Overview

The CSDR data model tracks spatial data processing pipelines from source data through to statistical outputs.

### Core Entities

**`dataset`** - Defines a data source that can be processed

- Example: Global Mangrove Watch Annual Extent

**`geometries`** - Defines a collection of spatial boundaries

- Example: Australian States and Territories 2021

**`product`** - Defines an analysis that combines a dataset with geometries

- Links to exactly one dataset and one geometries collection
- Example: Mangrove Coverage by Australian State

### Runs

"Runs" are used to track the processing of datasets, geometries, and products (basically "versions").

**`dataset_run`** - Records a specific processing of a dataset

- Stores processing parameters (projection, resolution, etc.)
- Example: GMW 2020 processed to 1km Mollweide projection

**`geometries_run`** - Records a specific processing of geometries

- Stores conversion parameters (name property, format, etc.)
- Example: ASGS boundaries converted to GeoParquet

**`product_run`** - Records a specific analysis execution

- References the exact `dataset_run` and `geometries_run` used
- Stores analysis parameters (fill values, statistics to compute, etc.)
- Example: Mangrove statistics calculated for all Australian states

### Outputs

**`geometry_output`** - Individual spatial features from a `geometries_run`

- Each row is one feature (e.g., one state)
- Stores the feature name, properties, and GeoJSON geometry
- Example: Tasmania with its boundary and metadata

**`product_output`** - Statistical results from a `product_run`

- Links a `geometry_output` to a `variable` with a computed value
- Example: Tasmania + mangrove_total_area = 0

### Variable System

**`variable_category`** - Hierarchical organization of variables

- Self-referential parent relationship for nested categories
- Example: Ecology > Coverage

**`variable`** - Defines what can be measured

- Belongs to a category and includes units
- Example: Mangrove Total Area (m²)
