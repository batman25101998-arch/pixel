"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map, type ExpressionSpecification } from "maplibre-gl";
import { useSession } from "next-auth/react";
import { useMapStore } from "@/stores/map-store";

const sourceId = "earth-hexes";
const hoverSourceId = "earth-hex-hover";
const selectedSourceId = "earth-hex-selected";
const fillLayerId = "earth-hexes-fill";
const lineLayerId = "earth-hexes-line";
const hoverFillLayerId = "earth-hex-hover-fill";
const hoverLineLayerId = "earth-hex-hover-line";
const selectedFillLayerId = "earth-hex-selected-fill";
const selectedLineLayerId = "earth-hex-selected-line";

const darkMapStyle =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://demotiles.maplibre.org/style.json";

function isLngLatCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function isLinearRing(value: unknown): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(isLngLatCoordinate) &&
    JSON.stringify(value[0]) === JSON.stringify(value[value.length - 1])
  );
}

function isPolygonCoordinates(value: unknown): value is [number, number][][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isLinearRing)
  );
}

function isGeoJsonFeature(value: unknown): value is GeoJSON.Feature<GeoJSON.Polygon> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const feature = value as Record<string, unknown>;
  return (
    feature.type === "Feature" &&
    typeof feature.geometry === "object" &&
    feature.geometry !== null &&
    (feature.geometry as Record<string, unknown>).type === "Polygon" &&
    isPolygonCoordinates((feature.geometry as Record<string, unknown>).coordinates) &&
    typeof feature.properties === "object" &&
    feature.properties !== null
  );
}

function isGeoJsonFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const collection = value as Record<string, unknown>;
  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.every(isGeoJsonFeature)
  );
}

function validateGeoJsonResponse(value: unknown): value is GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (!isGeoJsonFeatureCollection(value)) {
    console.error("Invalid GeoJSON response for /api/hexes", value);
    return false;
  }
  return true;
}

function hexFillColorExpression(currentUserId: string): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "status"], "AVAILABLE"],
    "#334155",
    ["==", ["get", "status"], "FOR_SALE"],
    "#facc15",
    ["==", ["get", "status"], "SPECIAL"],
    "#8b5cf6",
    ["==", ["get", "status"], "LOCKED"],
    "#8b5cf6",
    ["all", ["!=", ["get", "status"], "AVAILABLE"], ["==", ["get", "ownerId"], currentUserId]],
    "#22c55e",
    "#2563eb"
  ] as ExpressionSpecification;
}

function hexLineColorExpression(currentUserId: string): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "status"], "AVAILABLE"],
    "#94a3b8",
    ["==", ["get", "status"], "FOR_SALE"],
    "#facc15",
    ["==", ["get", "status"], "SPECIAL"],
    "#8b5cf6",
    ["==", ["get", "status"], "LOCKED"],
    "#8b5cf6",
    ["all", ["!=", ["get", "status"], "AVAILABLE"], ["==", ["get", "ownerId"], currentUserId]],
    "#22c55e",
    "#2563eb"
  ] as ExpressionSpecification;
}

export function EarthMap() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const requestRef = useRef(0);
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);
  const selectedHex = useMapStore((state) => state.selectedHex);
  const refreshToken = useMapStore((state) => state.refreshToken);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkMapStyle,
      center: [0, 20],
      zoom: 1.7,
      minZoom: 1.2,
      maxZoom: 19,
      maxPitch: 60,
      renderWorldCopies: false,
      attributionControl: false
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    async function loadHexes() {
      if (!map.getSource(sourceId)) return;
      const requestId = ++requestRef.current;
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
      const zoom = map.getZoom();
      const includeVirtual = "&includeVirtual=1";

      try {
        const response = await fetch(`/api/hexes?bbox=${bbox}&zoom=${Math.round(zoom)}${includeVirtual}&take=2000`);
        const data = await response.json();
        if (requestId !== requestRef.current) return;
        if (!validateGeoJsonResponse(data)) return;
        console.log("hex features", data.features.length);
        if (data.features.length === 0) {
          console.warn("No hex features returned from /api/hexes");
        }
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        source.setData(data);
      } catch (error) {
        console.error("/api/hexes load failed", error);
      }
    }

    map.on("load", () => {
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addSource(hoverSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addSource(selectedSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });

      map.addLayer({
        id: fillLayerId,
        source: sourceId,
        type: "fill",
        minzoom: 0,
        paint: {
          "fill-color": hexFillColorExpression(currentUserId),
          "fill-opacity": 0.25,
          "fill-outline-color": "#94a3b8"
        }
      });

      map.addLayer({
        id: lineLayerId,
        source: sourceId,
        type: "line",
        minzoom: 0,
        paint: {
          "line-color": "#94a3b8",
          "line-opacity": 0.5,
          "line-width": 1
        }
      });

      map.addLayer({
        id: hoverFillLayerId,
        source: hoverSourceId,
        type: "fill",
        minzoom: 0,
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.18
        }
      });

      map.addLayer({
        id: hoverLineLayerId,
        source: hoverSourceId,
        type: "line",
        minzoom: 0,
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.95,
          "line-width": 1
        }
      });

      map.addLayer({
        id: selectedFillLayerId,
        source: selectedSourceId,
        type: "fill",
        minzoom: 0,
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.24
        }
      });

      map.addLayer({
        id: selectedLineLayerId,
        source: selectedSourceId,
        type: "line",
        minzoom: 0,
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.95,
          "line-width": 1
        }
      });

      void loadHexes();
    });

    map.on("moveend", loadHexes);
    map.on("mousemove", fillLayerId, (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (!feature) return;
      const source = map.getSource(hoverSourceId) as maplibregl.GeoJSONSource;
      source.setData({
        type: "FeatureCollection",
        features: [feature as GeoJSON.Feature]
      });
    });
    map.on("mouseleave", fillLayerId, () => {
      map.getCanvas().style.cursor = "";
      const source = map.getSource(hoverSourceId) as maplibregl.GeoJSONSource;
      source.setData({ type: "FeatureCollection", features: [] });
    });
    map.on("click", async (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [fillLayerId] });
      if (features[0]) {
        const props = features[0].properties as Record<string, string | number | null>;
        const status = props.status ? String(props.status) : "AVAILABLE";
        const selectedFeature = features[0];
        setSelectedHex({
          h3Index: String(props.h3Index),
          lng: Number(props.longitude),
          lat: Number(props.latitude),
          purchased:
            status === "AVAILABLE"
              ? undefined
              : {
                  id: String(props.id),
                  ownerName: props.ownerName ? String(props.ownerName) : "Anonymous owner",
                  ownerImage: props.ownerImage ? String(props.ownerImage) : null,
                  message: props.message ? String(props.message) : "",
                  imageUrl: props.imageUrl ? String(props.imageUrl) : null,
                  status,
                  priceCents: Number(props.priceCents ?? 100)
                }
        });

        const selectedSource = map.getSource(selectedSourceId) as maplibregl.GeoJSONSource;
        selectedSource.setData({
          type: "FeatureCollection",
          features: [
            (selectedFeature as any).toJSON
              ? (selectedFeature as any).toJSON()
              : (selectedFeature as GeoJSON.Feature)
          ]
        });
        return;
      }

      const response = await fetch("/api/hexes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lng: event.lngLat.lng, lat: event.lngLat.lat })
      });
      const data = await response.json();
      setSelectedHex({ h3Index: data.h3Index, lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [currentUserId, setSelectedHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(selectedSourceId)) return;
    const selectedSource = map.getSource(selectedSourceId) as maplibregl.GeoJSONSource;
    if (!selectedHex) {
      selectedSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features = map.querySourceFeatures(sourceId, {
      filter: ["==", ["get", "h3Index"], selectedHex.h3Index]
    });

    if (features.length) {
      const feature = features[0] as any;
      selectedSource.setData({
        type: "FeatureCollection",
        features: [feature.toJSON ? feature.toJSON() : (feature as GeoJSON.Feature)]
      });
    }
  }, [selectedHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHex) return;
    map.flyTo({ center: [selectedHex.lng, selectedHex.lat], zoom: Math.max(map.getZoom(), 5), essential: true });
  }, [selectedHex?.h3Index]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(fillLayerId)) return;
    map.setPaintProperty(fillLayerId, "fill-color", hexFillColorExpression(currentUserId));
    map.setPaintProperty(lineLayerId, "line-color", hexLineColorExpression(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(sourceId)) return;
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
    const zoom = Math.round(map.getZoom());
    const includeVirtual = "&includeVirtual=1";
    fetch(`/api/hexes?bbox=${bbox}&zoom=${zoom}${includeVirtual}&take=2000`)
      .then((response) => response.json())
      .then((data) => {
        if (!validateGeoJsonResponse(data)) return;
        console.log("hex features", data.features.length);
        if (data.features.length === 0) {
          console.warn("No hex features returned from /api/hexes");
        }
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        source.setData(data);
      })
      .catch((error) => {
        console.error("/api/hexes refresh failed", error);
      });
  }, [refreshToken]);

  return <div ref={containerRef} className="h-screen w-full" />;
}
