#!/usr/bin/env python3
"""
Download and simplify communes GeoJSON (50m resolution).
- Remove overseas communes (codes starting with 97/98)
- Apply Douglas-Peucker simplification
- Output < 20MB
"""
import json
import urllib.request
import os
import math

URL = "https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/communes-50m.geojson"
OUT = os.path.join(os.path.dirname(__file__), "../public/data/communes_geo.json")

def point_line_distance(point, start, end):
    if start == end:
        dx = point[0] - start[0]
        dy = point[1] - start[1]
        return math.sqrt(dx*dx + dy*dy)
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx*dx + dy*dy)
    t = max(0, min(1, t))
    nx = start[0] + t * dx - point[0]
    ny = start[1] + t * dy - point[1]
    return math.sqrt(nx*nx + ny*ny)

def douglas_peucker(points, epsilon):
    if len(points) <= 2:
        return points
    dmax = 0
    index = 0
    for i in range(1, len(points) - 1):
        d = point_line_distance(points[i], points[0], points[-1])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        left = douglas_peucker(points[:index+1], epsilon)
        right = douglas_peucker(points[index:], epsilon)
        return left[:-1] + right
    else:
        return [points[0], points[-1]]

def simplify_ring(ring, epsilon):
    simplified = douglas_peucker(ring, epsilon)
    # Ensure ring is closed and has at least 4 points
    if len(simplified) < 4:
        return ring  # keep original if too simplified
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified

def round_coords_3(coords):
    return [[round(c, 3) for c in pt] for pt in coords]

def simplify_geometry(geom, epsilon):
    gtype = geom["type"]
    if gtype == "Polygon":
        geom["coordinates"] = [round_coords_3(simplify_ring(ring, epsilon)) for ring in geom["coordinates"]]
    elif gtype == "MultiPolygon":
        geom["coordinates"] = [[round_coords_3(simplify_ring(ring, epsilon)) for ring in poly] for poly in geom["coordinates"]]
    return geom

# Load from disk if already downloaded, else download
CACHE = os.path.join(os.path.dirname(__file__), "communes-50m-cache.geojson")
if os.path.exists(CACHE):
    print("Using cached file...")
    with open(CACHE, "r", encoding="utf-8") as f:
        data = json.load(f)
else:
    print(f"Downloading {URL}...")
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
    print(f"Downloaded {len(raw)/1e6:.1f} MB, parsing...")
    data = json.loads(raw)
    print("Saving cache...")
    with open(CACHE, "wb") as f:
        f.write(raw)

features = data.get("features", [])
print(f"Total features: {len(features)}")

# Filter overseas
filtered = []
for f in features:
    props = f.get("properties", {})
    code = props.get("code") or props.get("INSEE_COM") or ""
    if str(code).startswith("97") or str(code).startswith("98"):
        continue
    filtered.append(f)
print(f"After filtering overseas: {len(filtered)} features")

# Simplify with epsilon = 0.005 degrees (~500m at France latitude)
epsilon = 0.005
print(f"Simplifying with epsilon={epsilon}...")
out_features = []
for f in filtered:
    props = f.get("properties", {})
    code = props.get("code") or props.get("INSEE_COM", "")
    nom = props.get("nom") or props.get("NOM_COM", "")
    geom = f.get("geometry")
    if geom:
        geom = simplify_geometry(geom, epsilon)
    out_features.append({"type": "Feature", "properties": {"code": code, "nom": nom}, "geometry": geom})

out_data = {"type": "FeatureCollection", "features": out_features}
out_str = json.dumps(out_data, separators=(',', ':'), ensure_ascii=False)
size_mb = len(out_str.encode()) / 1e6
print(f"Output size with epsilon={epsilon}: {size_mb:.1f} MB")

# If still > 20MB, increase epsilon
if size_mb > 20:
    epsilon = 0.01
    print(f"Still too big, trying epsilon={epsilon}...")
    out_features2 = []
    for f in filtered:
        props = f.get("properties", {})
        code = props.get("code") or props.get("INSEE_COM", "")
        nom = props.get("nom") or props.get("NOM_COM", "")
        geom = f.get("geometry")
        if geom:
            geom = simplify_geometry(geom, epsilon)
        out_features2.append({"type": "Feature", "properties": {"code": code, "nom": nom}, "geometry": geom})
    out_data = {"type": "FeatureCollection", "features": out_features2}
    out_str = json.dumps(out_data, separators=(',', ':'), ensure_ascii=False)
    size_mb = len(out_str.encode()) / 1e6
    print(f"Output size with epsilon={epsilon}: {size_mb:.1f} MB")

with open(OUT, "w", encoding="utf-8") as f:
    f.write(out_str)

print(f"Done! Saved to {OUT} ({size_mb:.1f} MB)")
