#!/usr/bin/env bash
# Generate PMTiles from Etalab commune boundaries
# Requires: Docker (for tippecanoe)

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Step 1: Download commune boundaries (5m resolution) ==="
curl -L -o communes-5m.geojson \
  "https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/communes-5m.geojson"

echo "=== Step 2: Generate PMTiles with tippecanoe ==="
docker run --rm -v "$(pwd):/data" ghcr.io/felt/tippecanoe:latest tippecanoe \
  -o /data/public/data/communes.pmtiles \
  -l communes \
  -z12 -Z4 \
  --simplification=10 \
  --detect-shared-borders \
  --coalesce-densest-as-needed \
  /data/communes-5m.geojson

echo "=== Step 3: Cleanup ==="
rm communes-5m.geojson

echo "=== Done! PMTiles file: public/data/communes.pmtiles ==="
ls -lh public/data/communes.pmtiles
