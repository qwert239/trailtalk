import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate, Link } from "react-router-dom";

type BoundsMap = Record<string, maplibregl.LngLatBounds>;
interface Park {
    name: string;
    state: string;
    slug: string;
    established: number;
    area_sq_mi: number;
    visitors: string;
    description: string;
}

const FEATURED_PARKS: GeoJSON.FeatureCollection<GeoJSON.Point, Park> = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
                name: "Yosemite National Park",
                state: "California",
                slug: "yosemite",
                established: 1890,
                area_sq_mi: 1187,
                visitors: "3.9M",
                description: "Granite cliffs, waterfalls, and giant sequoias",
            },
            geometry: { type: "Point", coordinates: [-119.5383, 37.8651] },
        },
        {
            type: "Feature",
            properties: {
                name: "Great Smoky Mountains National Park",
                state: "Tennessee",
                slug: "great-smoky-mountains",
                established: 1934,
                area_sq_mi: 816,
                visitors: "13.3M",
                description: "Most visited park with Appalachian biodiversity",
            },
            geometry: { type: "Point", coordinates: [-83.5102, 35.6118] },
        },
        {
            type: "Feature",
            properties: {
                name: "Zion National Park",
                state: "Utah",
                slug: "zion",
                established: 1919,
                area_sq_mi: 229,
                visitors: "4.6M",
                description: "Red sandstone canyons and towering cliffs",
            },
            geometry: { type: "Point", coordinates: [-113.0263, 37.2982] },
        },
        {
            type: "Feature",
            properties: {
                name: "Yellowstone National Park",
                state: "Wyoming",
                slug: "yellowstone",
                established: 1872,
                area_sq_mi: 3472,
                visitors: "4.5M",
                description: "First national park with geysers and wildlife",
            },
            geometry: { type: "Point", coordinates: [-110.5885, 44.428] },
        },
        {
            type: "Feature",
            properties: {
                name: "Acadia National Park",
                state: "Maine",
                slug: "acadia",
                established: 1919,
                area_sq_mi: 49,
                visitors: "3.9M",
                description: "Coastal park with granite peaks and ocean views",
            },
            geometry: { type: "Point", coordinates: [-68.2733, 44.3386] },
        },
    ],
};

const HOME_CENTER: [number, number] = [-98.5795, 39.8283];
const CONUS_BOUNDS = new maplibregl.LngLatBounds([-125, 24], [-66.5, 49.5]);
const USA_BOUNDS = new maplibregl.LngLatBounds([-170, 15], [-50, 72]);
const HOME_MAX_ZOOM = 5;
const PAD = { top: 120, right: 72, bottom: 48, left: 72 };

const SPECIAL_STATE_BOUNDS: Record<string, maplibregl.LngLatBounds> = {
    Alaska: new maplibregl.LngLatBounds([-170, 51], [-130, 71]),
    Hawaii: new maplibregl.LngLatBounds([-160.5, 18.8], [-154.7, 22.3]),
    Michigan: new maplibregl.LngLatBounds([-90.5, 41.5], [-82.1, 48.3]),
};

const getMapStyle = (apiKey: string): maplibregl.StyleSpecification => {
    if (!apiKey) return { version: 8, sources: {}, layers: [] };
    return {
        version: 8,
        glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${apiKey}`,
        sources: {
            "satellite-base": {
                type: "raster",
                url: `https://api.maptiler.com/tiles/satellite/tiles.json?key=${apiKey}`
            },
        },
        layers: [
            { id: "background", type: "background", paint: { "background-color": "#000000" } },
            {
                id: "satellite-layer",
                type: "raster",
                source: "satellite-base",
                minzoom: 0,
                maxzoom: 24,
                paint: {
                    "raster-opacity": 1,
                    "raster-brightness-min": 0,
                    "raster-brightness-max": 0.9,
                    "raster-contrast": 0.25,
                    "raster-saturation": -0.25,
                    "raster-hue-rotate": -10,
                },
            },
        ],
    };
};

const MAPTILER_KEY = (process.env.REACT_APP_MAPTILER_KEY || "").trim();
if (!MAPTILER_KEY) {
    console.warn("[Map] No REACT_APP_MAPTILER_KEY in .env. Satellite tiles will not load.");
}

const addSourceOnce = (map: maplibregl.Map, id: string, src: any) => {
    if (!map.getSource(id)) map.addSource(id, src);
};

type LayerLike = maplibregl.LayerSpecification & { id: string };

const addLayerOnce = (
    map: maplibregl.Map,
    layer: LayerLike | any,
    beforeId?: string
) => {
    if (!map.getLayer(layer.id)) map.addLayer(layer as any, beforeId);
};

const getStatePadding = (sidebarIsOpen: boolean, sidebarW: number) => ({
    top: 120,
    right: 72,
    bottom: 48,
    left: sidebarIsOpen ? sidebarW + 32 : 72,
});

const calculateOptimalZoom = (bounds: maplibregl.LngLatBounds): number => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const width = Math.abs(ne.lng - sw.lng);
    const height = Math.abs(ne.lat - sw.lat);
    const area = width * height;
    if (area < 1) return 9;
    if (area < 5) return 8;
    if (area < 15) return 7;
    if (area < 50) return 6;
    if (area < 200) return 5;
    return 4;
};

function boundsAndCentroid(geom: any) {
    const b = new maplibregl.LngLatBounds();
    const acc = { x: 0, y: 0, n: 0 };
    const walk = (coords: any) => {
        if (Array.isArray(coords[0][0])) coords.forEach(walk);
        else coords.forEach((pt: number[]) => {
            b.extend(pt as [number, number]);
            acc.x += pt[0];
            acc.y += pt[1];
            acc.n += 1;
        });
    };
    walk(geom.coordinates);
    const c = b.getCenter();
    const cx = acc.n ? acc.x / acc.n : c.lng;
    const cy = acc.n ? acc.y / acc.n : c.lat;
    return { bounds: b, center: [cx, cy] as [number, number] };
}

const isRoughlyHome = (map: maplibregl.Map) => {
    const z = map.getZoom();
    if (z > HOME_MAX_ZOOM + 0.1) return false;
    const c = map.getCenter();
    const centerOk = Math.abs(c.lng - HOME_CENTER[0]) < 4 && Math.abs(c.lat - HOME_CENTER[1]) < 3;
    const b = map.getBounds();
    const m = 1.5;
    const contains =
        b.getWest() <= CONUS_BOUNDS.getWest() + m &&
        b.getSouth() <= CONUS_BOUNDS.getSouth() + m &&
        b.getEast() >= CONUS_BOUNDS.getEast() - m &&
        b.getNorth() >= CONUS_BOUNDS.getNorth() - m;
    return centerOk && contains;
};

export default function MapLanding() {
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    const [isZoomed, setIsZoomed] = useState(false);
    const [activeState, setActiveState] = useState<string | null>(null);
    const [stateBounds, setStateBounds] = useState<BoundsMap>({});
    const [parks, setParks] = useState<Park[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [showUsaTitle, setShowUsaTitle] = useState(true);

    useEffect(() => {
        if (!ref.current) return;

        const map = new maplibregl.Map({
            container: ref.current,
            style: getMapStyle(MAPTILER_KEY),
            center: HOME_CENTER,
            zoom: 3.6,
            minZoom: 2.8,
            maxZoom: 12,
            maxBounds: USA_BOUNDS,
            dragRotate: false,
            pitchWithRotate: false,
        });

        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.doubleClickZoom.disable();

        map.on("load", async () => {
            addSourceOnce(map, "states", { type: "geojson", data: "/states.geojson", generateId: true });

            addLayerOnce(map, {
                id: "state-fills",
                type: "fill",
                source: "states",
                paint: {
                    "fill-color": "#4a7c59",
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.18,
                        0.0
                    ],
                },
            });

            addLayerOnce(map, {
                id: "state-borders",
                type: "line",
                source: "states",
                paint: {
                    "line-color": "#d2e2d2",
                    "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 6, 1.2, 8, 2.2],
                    "line-blur": 0.2,
                    "line-opacity": 0.9,
                },
            });

            // centroid points
            addSourceOnce(map, "state-label-points", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            // park sources
            addSourceOnce(map, "parks", { type: "geojson", data: "/parks.geojson" });
            addSourceOnce(map, "featured-parks", { type: "geojson", data: FEATURED_PARKS });

            // badge image
            try {
                const img = await map.loadImage("/NPBadge.png");
                if (!map.hasImage("park-badge")) map.addImage("park-badge", img.data);
            } catch {
            }

            // state-level badges (hidden at national view)
            addLayerOnce(map, {
                id: "park-badges-icons",
                type: "symbol",
                source: "parks",
                layout: {
                    "icon-image": "park-badge",
                    "icon-size": 0.3,
                    "icon-anchor": "bottom",
                    "icon-allow-overlap": true,
                    visibility: "none",
                },
            });
            addLayerOnce(map, {
                id: "park-badges-labels",
                type: "symbol",
                source: "parks",
                layout: {
                    "text-field": ["get", "name"],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": 12,
                    "text-anchor": "top",
                    "text-offset": [0, 0.3],
                    "text-max-width": 10,
                    "text-allow-overlap": true,
                    "text-optional": true,
                    visibility: "none",
                },
                paint: { "text-color": "#f0f0f0", "text-halo-color": "#000", "text-halo-width": 1.5 },
            });

            // national-view featured badges (visible on zoom out)
            addLayerOnce(map, {
                id: "featured-badges-icons",
                type: "symbol",
                source: "featured-parks",
                layout: {
                    "icon-image": "park-badge",
                    "icon-size": 0.32,
                    "icon-anchor": "bottom",
                    "icon-allow-overlap": true,
                    visibility: "visible",
                },
            });
            addLayerOnce(map, {
                id: "featured-badges-labels",
                type: "symbol",
                source: "featured-parks",
                layout: {
                    "text-field": ["get", "name"],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": 12,
                    "text-anchor": "top",
                    "text-offset": [0, 0.3],
                    "text-max-width": 12,
                    "text-allow-overlap": true, // don't block state names
                    "text-optional": true,
                    "symbol-sort-key": 1,
                    visibility: "visible",
                },
                paint: { "text-color": "#f0f0f0", "text-halo-color": "#000", "text-halo-width": 1.5 },
            });

            try {
                const gj = await (await fetch("/states.geojson")).json();
                const out: BoundsMap = {};
                const points: GeoJSON.Feature<GeoJSON.Point, any>[] = [];
                (gj.features || []).forEach((f: any) => {
                    const name = f.properties?.NAME || f.properties?.name;
                    if (!name) return;
                    const { bounds, center } = boundsAndCentroid(f.geometry);
                    out[name] = bounds;
                    points.push({ type: "Feature", properties: { NAME: name }, geometry: { type: "Point", coordinates: center } });
                });
                setStateBounds(out);
                const src = map.getSource("state-label-points") as maplibregl.GeoJSONSource;
                src.setData({ type: "FeatureCollection", features: points });
            } catch {
                /* ignore */
            }

            // parks for sidebar list
            try {
                const parksGJ = await (await fetch("/parks.geojson")).json();
                setParks((parksGJ.features || []).map((f: any) => f.properties));
            } catch { /* ignore */ }

            // initial fit
            map.fitBounds(CONUS_BOUNDS, { padding: PAD, duration: 0, maxZoom: HOME_MAX_ZOOM });
            setShowUsaTitle(true);
        });

        // hover feedback
        let hoveredId: number | string | null = null;
        map.on("mousemove", "state-fills", (e) => {
            const f = e.features?.[0];
            if (!f) return;
            if (hoveredId !== null) map.setFeatureState({ source: "states", id: hoveredId }, { hover: false });
            hoveredId = f.id as number | string;
            map.setFeatureState({ source: "states", id: hoveredId }, { hover: true });
            map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "state-fills", () => {
            map.getCanvas().style.cursor = "";
            if (hoveredId !== null) {
                map.setFeatureState({ source: "states", id: hoveredId }, { hover: false });
                hoveredId = null;
            }
        });

        // zoom into state on click
        map.on("click", "state-fills", (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const name = (f.properties?.NAME || f.properties?.name) as string | undefined;
            if (!name) return;

            const bounds = new maplibregl.LngLatBounds();
            const walk = (c: any): void => { Array.isArray(c[0]) ? c.forEach(walk) : bounds.extend(c as [number, number]); };
            walk((f as any).geometry.coordinates);

            const padding = getStatePadding(true, sidebarWidth);
            const optimalZoom = calculateOptimalZoom(bounds);
            map.fitBounds(bounds, { padding, duration: 900, maxZoom: optimalZoom, easing: (t) => t * (2 - t) });
            setIsZoomed(true);
            setShowUsaTitle(false);
            setActiveState(name);
        });

        map.on("mouseenter", "featured-badges-icons", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "featured-badges-icons", () => { map.getCanvas().style.cursor = ""; });
        map.on("click", "featured-badges-icons", (e) => {
            const f = e.features?.[0] as any;
            const slug: string | undefined = f?.properties?.slug;
            if (slug) window.open(`https://evergreen-industries.web.app/parks/${slug}`, "_blank");
        });

        map.on("moveend", () => setShowUsaTitle(isRoughlyHome(map)));

        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
    }, []); // init

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        const perState = isZoomed && activeState ? "visible" : "none";
        const national = !isZoomed ? "visible" : "none";

        if (map.getLayer("park-badges-icons")) {
            map.setLayoutProperty("park-badges-icons", "visibility", perState);
            map.setFilter("park-badges-icons", isZoomed && activeState ? ["==", ["get", "state"], activeState] as any : null);
        }
        if (map.getLayer("park-badges-labels")) {
            map.setLayoutProperty("park-badges-labels", "visibility", perState);
            map.setFilter("park-badges-labels", isZoomed && activeState ? ["==", ["get", "state"], activeState] as any : null);
        }
        if (map.getLayer("featured-badges-icons")) map.setLayoutProperty("featured-badges-icons", "visibility", national);
        if (map.getLayer("featured-badges-labels")) map.setLayoutProperty("featured-badges-labels", "visibility", national);
    }, [isZoomed, activeState]);

    // sidebar resize
    useEffect(() => {
        if (!isResizing) return;
        const onMove = (e: MouseEvent) => setSidebarWidth(Math.max(280, Math.min(600, e.clientX)));
        const onUp = () => setIsResizing(false);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    }, [isResizing]);

    const zoomToUSA = () => {
        const pad = getStatePadding(false, sidebarWidth);
        mapRef.current?.fitBounds(CONUS_BOUNDS, { padding: pad, duration: 800, maxZoom: HOME_MAX_ZOOM, easing: (t) => t * (2 - t) });
        setIsZoomed(false);
        setActiveState(null);
    };
    const zoomToState = (name: string) => {
        const map = mapRef.current; if (!map) return;
        const pad = getStatePadding(sidebarOpen, sidebarWidth);
        const bounds = SPECIAL_STATE_BOUNDS[name] || stateBounds[name]; if (!bounds) return;
        const optimalZoom = calculateOptimalZoom(bounds);
        map.fitBounds(bounds, { padding: pad, duration: 900, maxZoom: optimalZoom, easing: (t) => t * (2 - t) });
        setIsZoomed(true); setShowUsaTitle(false); setActiveState(name);
    };

    const filteredParks = parks.filter(p => p.state === activeState).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <>
            <div ref={ref} style={{ position: "absolute", inset: 0, backgroundColor: "#000" }} />

            {showUsaTitle && (
                <div
                    style={{
                        position: "absolute", top: 64, left: 0, right: 0, textAlign: "center",
                        zIndex: 25, pointerEvents: "none",
                        letterSpacing: 6, fontWeight: 700, color: "#fff",
                        textShadow: "0 2px 8px rgba(0,0,0,0.6)", fontSize: 24,
                        fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial",
                    }}
                >
                    UNITED STATES OF AMERICA
                </div>
            )}

            <div style={styles.chips}>
                <button onClick={() => zoomToState("Alaska")} className="map-chip">Alaska</button>
                <button onClick={() => zoomToState("Hawaii")} className="map-chip">Hawaii</button>
                {isZoomed && <button onClick={zoomToUSA} className="map-chip map-chip-primary">Back to USA</button>}
            </div>

            {activeState && (
                <div className="state-tag" style={styles.tag}>
                    Viewing: <strong>{activeState}</strong>
                </div>
            )}

            {isZoomed && activeState && (
                <>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ ...styles.sidebarToggle, left: sidebarOpen ? sidebarWidth : 0 }}
                        className="sidebar-toggle"
                    >
                        {sidebarOpen ? "◀" : "▶"}
                    </button>

                    <div
                        style={{ ...styles.sidebar, width: sidebarWidth, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}
                        className="parks-sidebar"
                    >
                        <div style={styles.sidebarHeader}>
                            <h3 style={styles.sidebarTitle}>Parks in {activeState}</h3>
                            <p style={styles.sidebarCount}>{filteredParks.length} park{filteredParks.length !== 1 ? "s" : ""}</p>
                        </div>

                        <div style={styles.parksList}>
                            {filteredParks.map((park) => (
                                <button key={park.slug} onClick={() => navigate(`/parks/${park.slug}`)} style={styles.parkCard} className="park-card">
                                    <h4 style={styles.parkName}>{park.name}</h4>
                                    <p style={styles.parkDescription}>{park.description}</p>
                                    <div style={styles.parkMeta}>
                                        <span style={styles.metaItem}>Est. {park.established}</span>
                                        <span style={styles.metaItem}>{park.area_sq_mi.toLocaleString()} sq mi</span>
                                    </div>
                                    <div style={styles.parkVisitors}>{park.visitors} annual visitors</div>
                                </button>
                            ))}
                        </div>

                        <div style={styles.resizeHandle} onMouseDown={() => setIsResizing(true)} className="resize-handle" />
                    </div>
                </>
            )}
        </>
    );
}

const styles = {
    chips: {
        position: "absolute" as const, top: 16, right: 16, zIndex: 20, display: "flex", gap: 8, flexWrap: "wrap" as const,
    },
    tag: {
        position: "absolute" as const, left: 16, bottom: 16, zIndex: 20,
    },
    sidebar: {
        position: "absolute" as const, left: 0, top: 0, bottom: 0,
        background: "rgba(58,46,37,0.1)", backdropFilter: "blur(12px)", borderRight: "1px solid rgba(168,159,145,0.3)",
        zIndex: 30, transition: "transform 0.3s ease", display: "flex", flexDirection: "column" as const,
    },
    sidebarToggle: {
        position: "absolute" as const, top: "50%", transform: "translateY(-50%)", width: 32, height: 64,
        background: "rgba(58,46,37,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(168,159,145,0.3)",
        borderLeft: "none", borderRadius: "0 8px 8px 0", color: "#d4c5a9", fontSize: 18, cursor: "pointer",
        zIndex: 31, transition: "left 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center",
    },
    sidebarHeader: { padding: "24px 20px 16px", borderBottom: "1px solid rgba(168,159,145,0.2)" },
    sidebarTitle: { margin: 0, fontSize: 20, fontWeight: 600, color: "#f5f1e8" },
    sidebarCount: { margin: "8px 0 0", fontSize: 13, color: "#d4c5a9" },
    parksList: { flex: 1, overflowY: "auto" as const, padding: "12px" },
    parkCard: {
        width: "100%", padding: 16, marginBottom: 12, background: "rgba(92,74,58,0.5)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(168,159,145,0.3)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s ease",
        textAlign: "left" as const, color: "inherit",
    },
    parkName: { margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#f5f1e8" },
    parkDescription: { margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "#d4c5a9" },
    parkMeta: { display: "flex", gap: 12, marginBottom: 8 },
    metaItem: { fontSize: 12, color: "#a89f91" },
    parkVisitors: { fontSize: 12, color: "#d4c5a9", fontWeight: 500 },
    resizeHandle: { position: "absolute" as const, right: 0, top: 0, bottom: 0, width: 4, cursor: "ew-resize", background: "transparent" },
};