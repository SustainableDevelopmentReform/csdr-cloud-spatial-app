# Importing precomputed product measurements

The product-output CSV endpoint imports values into an existing product run. The
run must already link to its geometry run, and each mapped indicator must exist
and be writable by the caller.

Use the geometry's local ID in the selected CSV column. The importer adds the
geometry run ID and a hyphen. For example, `region-a` in run `boundaries-v1`
resolves to geometry output `boundaries-v1-region-a`. Supplying that full output
ID in the CSV would add the prefix twice. Check the actual geometry properties
and output IDs before preparing imports; do not assume a source's identifier
convention.

An empty or whitespace-only measurement cell is missing and is skipped with a
warning. A literal numeric zero is retained. Non-numeric and non-finite values
also produce warnings and are skipped. The response reports the inserted count
and warnings; an import with no usable measurements returns 400 without creating
outputs. Review those counts and warnings before selecting a main run.

This does not alter existing outputs. Imports made before this change stored
blank cells as `0`. To correct one, import the original CSV into a new product
run and make that the main run; keep the historical run and any report captures
intact.
