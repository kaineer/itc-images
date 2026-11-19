#!/usr/bin/env python3
"""Enrich buildings.json heights/addresses from local OSM map_data.xml + heuristics."""
from __future__ import annotations

import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path

EARTH_RADIUS = 6378137.0
METERS_PER_LEVEL = 3.0
ADDR_MAX_DIST = 100.0
CELL = 50.0

ROOT = Path(__file__).resolve().parents[1]
BUILDINGS_IN = Path("/home/kaineer/devel/itc/maps.ai/stages/import/buildings.json")
BUILDINGS_OUT = ROOT / "data" / "buildings.json"
XML_PATH = Path("/home/kaineer/devel/itc/maps.ai/stages/import/map_data.xml")
STREETS_PATH = ROOT / "data" / "streets.json"

# Median levels by building type × footprint area (from local OSM tagged buildings).
AREA_LEVELS = {
    "apartments": [(400, 5), (1000, 2), (3000, 5), (10000, 5), (1e18, 9)],
    "residential": [(400, 3), (1000, 3), (3000, 5), (10000, 5), (1e18, 9)],
    "dormitory": [(1000, 5), (3000, 5), (1e18, 9)],
    "office": [(400, 2), (1000, 2), (3000, 4), (10000, 4), (1e18, 5)],
    "commercial": [(1000, 2), (3000, 3), (1e18, 4)],
    "retail": [(1000, 2), (3000, 2), (1e18, 3)],
    "school": [(1e18, 3)],
    "university": [(1e18, 4)],
    "hospital": [(1e18, 4)],
    "clinic": [(1e18, 3)],
    "kindergarten": [(1e18, 2)],
    "industrial": [(1000, 1), (3000, 2), (10000, 2), (1e18, 3)],
    "warehouse": [(3000, 1), (1e18, 2)],
    "hangar": [(1e18, 3)],
    "house": [(400, 1), (1000, 2), (1e18, 2)],
    "detached": [(400, 1), (1000, 2), (1e18, 2)],
    "semidetached_house": [(1e18, 2)],
    "terrace": [(1e18, 2)],
    "yes": [(400, 1), (1000, 1), (3000, 2), (10000, 3), (1e18, 3)],
}

FLAT_TYPE_HEIGHT = {
    "bungalow": 3.0,
    "cabin": 3.0,
    "hut": 3.0,
    "shed": 3.0,
    "garage": 3.0,
    "garages": 3.0,
    "carport": 3.0,
    "kiosk": 3.0,
    "service": 3.0,
    "roof": 3.0,
    "greenhouse": 3.0,
    "construction": 3.0,
    "ruins": 3.0,
    "supermarket": 9.0,
    "manufacture": 6.0,
}


def lat_lng_to_scene(lat: float, lon: float) -> tuple[float, float]:
    lat_rad = math.radians(lat)
    lng_rad = math.radians(lon)
    x = EARTH_RADIUS * lng_rad
    z = EARTH_RADIUS * math.log(math.tan(math.pi / 4 + lat_rad / 2))
    return -x, z


def parse_height_tag(raw: str | None) -> float | None:
    if not raw:
        return None
    s = str(raw).strip().lower().replace(",", ".")
    for suffix in ("meters", "metres", "m", "м"):
        if s.endswith(suffix):
            s = s[: -len(suffix)].strip()
            break
    if "-" in s:
        vals = []
        for p in s.split("-"):
            try:
                vals.append(float(p.strip()))
            except ValueError:
                pass
        return max(vals) if vals else None
    try:
        v = float(s)
        return v if v > 0 else None
    except ValueError:
        return None


def address_from_tags(tags: dict) -> str | None:
    full = (tags.get("addr:full") or "").strip()
    if full:
        return full
    street = (tags.get("addr:street") or "").strip()
    hn = (tags.get("addr:housenumber") or "").strip()
    place = (tags.get("addr:place") or "").strip()
    if street and hn:
        return f"{street}, {hn}"
    if place and hn:
        return f"{place}, {hn}"
    if street and hn:
        return f"{street}, {hn}"
    return None


def height_from_tags(tags: dict) -> float | None:
    h = parse_height_tag(tags.get("height"))
    if h is not None:
        return h
    levels = tags.get("building:levels")
    if levels is None:
        return None
    try:
        lv = float(str(levels).replace(",", "."))
    except ValueError:
        return None
    return lv * METERS_PER_LEVEL if lv > 0 else None


def footprint_area(nodes: list[dict]) -> float:
    n = len(nodes)
    if n < 3:
        return 0.0
    s = 0.0
    for i in range(n):
        j = (i + 1) % n
        s += nodes[i]["x"] * nodes[j]["z"] - nodes[j]["x"] * nodes[i]["z"]
    return abs(s) / 2.0


def height_from_type_area(tags: dict, area: float) -> float | None:
    btype = (tags.get("building") or "").strip().lower()
    if btype in FLAT_TYPE_HEIGHT:
        return FLAT_TYPE_HEIGHT[btype]
    rows = AREA_LEVELS.get(btype)
    if not rows:
        return None
    for max_area, levels in rows:
        if area < max_area:
            return float(levels) * METERS_PER_LEVEL
    return float(rows[-1][1]) * METERS_PER_LEVEL


def point_in_poly(x: float, z: float, nodes: list[dict]) -> bool:
    n = len(nodes)
    if n < 3:
        return False
    inside = False
    j = n - 1
    for i in range(n):
        xi, zi = nodes[i]["x"], nodes[i]["z"]
        xj, zj = nodes[j]["x"], nodes[j]["z"]
        if ((zi > z) != (zj > z)) and (
            x < (xj - xi) * (z - zi) / ((zj - zi) or 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def centroid(nodes: list[dict]) -> tuple[float, float]:
    sx = sz = 0.0
    for n in nodes:
        sx += n["x"]
        sz += n["z"]
    c = len(nodes) or 1
    return sx / c, sz / c


def dist2(ax: float, az: float, bx: float, bz: float) -> float:
    dx, dz = ax - bx, az - bz
    return dx * dx + dz * dz


def load_osm() -> tuple[dict[str, dict], list[dict]]:
    way_or_rel: dict[str, dict] = {}
    addr_nodes: list[dict] = []
    for _event, elem in ET.iterparse(XML_PATH, events=("end",)):
        if elem.tag == "way":
            tags = {t.get("k"): t.get("v") for t in elem.findall("tag")}
            if "building" in tags:
                way_or_rel[elem.get("id")] = tags
            elem.clear()
        elif elem.tag == "relation":
            tags = {t.get("k"): t.get("v") for t in elem.findall("tag")}
            if tags.get("type") == "multipolygon" and "building" in tags:
                way_or_rel[elem.get("id")] = tags
            elem.clear()
        elif elem.tag == "node":
            tags = {t.get("k"): t.get("v") for t in elem.findall("tag")}
            if "addr:housenumber" in tags or "addr:full" in tags:
                addr = address_from_tags(tags)
                if not addr:
                    # allow hn-only nodes; street filled later if needed
                    hn = (tags.get("addr:housenumber") or "").strip()
                    street = (tags.get("addr:street") or "").strip()
                    if street and hn:
                        addr = f"{street}, {hn}"
                    elif tags.get("addr:full"):
                        addr = tags["addr:full"].strip()
                if addr:
                    x, z = lat_lng_to_scene(
                        float(elem.get("lat")), float(elem.get("lon"))
                    )
                    addr_nodes.append(
                        {"id": elem.get("id"), "x": x, "z": z, "address": addr}
                    )
            elem.clear()
    return way_or_rel, addr_nodes


def build_grid(items: list[dict], xkey="x", zkey="z") -> dict[tuple[int, int], list]:
    grid: dict[tuple[int, int], list] = {}
    for it in items:
        key = (int(it[xkey] // CELL), int(it[zkey] // CELL))
        grid.setdefault(key, []).append(it)
    return grid


def nearby(grid, x, z, ring=4):
    gx, gz = int(x // CELL), int(z // CELL)
    out = []
    for dx in range(-ring, ring + 1):
        for dz in range(-ring, ring + 1):
            out.extend(grid.get((gx + dx, gz + dz), []))
    return out


def nearest_street_name(street_grid, x, z, max_dist=60.0) -> str | None:
    best = None
    best_d = max_dist * max_dist
    for s in nearby(street_grid, x, z, ring=2):
        for n in s.get("nodes") or []:
            d = dist2(x, z, n["x"], n["z"])
            if d < best_d:
                best_d = d
                best = s.get("name")
    return best


def main() -> None:
    print("Loading buildings…")
    buildings = json.loads(BUILDINGS_IN.read_text(encoding="utf-8"))["buildings"]

    print("Loading streets…")
    streets = json.loads(STREETS_PATH.read_text(encoding="utf-8")).get("streets", [])
    street_pts = []
    for s in streets:
        if not s.get("name"):
            continue
        nodes = s.get("nodes") or []
        if not nodes:
            continue
        cx, cz = centroid(nodes)
        street_pts.append({"x": cx, "z": cz, "name": s["name"], "nodes": nodes})
    street_grid = build_grid(street_pts)

    print("Parsing OSM…")
    tags_by_id, addr_nodes = load_osm()
    addr_grid = build_grid(addr_nodes)
    print(
        f"buildings={len(buildings)} osm_tags={len(tags_by_id)} "
        f"addr_nodes={len(addr_nodes)} streets={len(street_pts)}"
    )

    stats = {
        "height_from_osm": 0,
        "height_from_type_area": 0,
        "address_from_tags": 0,
        "address_hn_plus_street": 0,
        "address_from_name": 0,
        "address_from_node_pip": 0,
        "address_from_node_near": 0,
    }

    need_addr: list[dict] = []
    for b in buildings:
        bid = str(b["id"])
        tags = tags_by_id.get(bid) or {}
        nodes = b.get("nodes") or []
        area = footprint_area(nodes)

        h = height_from_tags(tags)
        if h is not None:
            if abs(float(b.get("height") or 0) - h) > 0.05:
                stats["height_from_osm"] += 1
            b["height"] = h
        else:
            ht = height_from_type_area(tags, area)
            if ht is not None:
                old = float(b.get("height") or 0)
                # Replace default 3m, or upgrade weak defaults when type/area says taller
                if old <= 3.05 or ht > old:
                    if abs(old - ht) > 0.05:
                        stats["height_from_type_area"] += 1
                    b["height"] = ht

        if b.get("address"):
            continue

        addr = address_from_tags(tags)
        if addr:
            b["address"] = addr
            stats["address_from_tags"] += 1
            continue

        hn = (tags.get("addr:housenumber") or "").strip()
        if hn and nodes:
            cx, cz = centroid(nodes)
            street = nearest_street_name(street_grid, cx, cz)
            if street:
                b["address"] = f"{street}, {hn}"
                stats["address_hn_plus_street"] += 1
                continue

        need_addr.append(b)

    # Unique assignment of addr nodes → buildings without address
    candidates: list[tuple[float, str, dict, dict]] = []
    for b in need_addr:
        nodes = b.get("nodes") or []
        if not nodes:
            continue
        cx, cz = centroid(nodes)
        for a in nearby(addr_grid, cx, cz, ring=4):
            if point_in_poly(a["x"], a["z"], nodes):
                candidates.append((0.0, "pip", b, a))
            else:
                d = math.sqrt(dist2(cx, cz, a["x"], a["z"]))
                if d <= ADDR_MAX_DIST:
                    candidates.append((d, "near", b, a))

    candidates.sort(key=lambda t: (0 if t[1] == "pip" else 1, t[0]))
    used_nodes: set[str] = set()
    assigned: set[str] = set()
    for _score, kind, b, a in candidates:
        bid = str(b["id"])
        if bid in assigned or a["id"] in used_nodes or b.get("address"):
            continue
        b["address"] = a["address"]
        used_nodes.add(a["id"])
        assigned.add(bid)
        stats["address_from_node_pip" if kind == "pip" else "address_from_node_near"] += 1

    # Weaker fallback: building name when no postal address exists
    for b in buildings:
        if b.get("address"):
            continue
        tags = tags_by_id.get(str(b["id"])) or {}
        name = (tags.get("name") or "").strip()
        if name:
            b["address"] = name
            stats["address_from_name"] += 1

    BUILDINGS_OUT.write_text(
        json.dumps({"buildings": buildings}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    h3 = sum(1 for b in buildings if abs(float(b.get("height") or 0) - 3) < 0.05)
    no_addr = sum(1 for b in buildings if not b.get("address"))
    print("stats", stats)
    print(f"after: height==3 {h3}, no address {no_addr}, total {len(buildings)}")
    print("written", BUILDINGS_OUT)


if __name__ == "__main__":
    main()
