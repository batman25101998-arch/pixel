"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { cellToLatLng, isValidCell } from "h3-js";
import maplibregl, { Map, type ExpressionSpecification, type StyleSpecification } from "maplibre-gl";
import { useSession } from "next-auth/react";
import { DEMO_USER, isClientDemoMode } from "@/lib/demo";
import { getDemoOwnedHexes, getDemoTerritories } from "@/lib/demo-storage";
import { useMapStore, type SelectedHex } from "@/stores/map-store";

const sourceId = "earth-hexes";
const selectedSourceId = "earth-hex-selected";
const territorySourceId = "earth-territories";
const fillLayerId = "earth-hexes-fill";
const outlineLayerId = "earth-hexes-outline";
const territoryFillLayerId = "earth-territories-fill";
const territoryLineLayerId = "earth-territories-line";
const selectedFillLayerId = "earth-hex-selected-fill";
const selectedLineLayerId = "earth-hex-selected-line";

const darkMapStyle: string | StyleSpecification =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  {
    version: 8,
    sources: {
      cartoDark: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }
    },
    layers: [
      {
        id: "pixel-world-background",
        type: "background",
        paint: {
          "background-color": "#071525"
        }
      },
      {
        id: "carto-dark",
        type: "raster",
        source: "cartoDark",
        paint: {
          "raster-opacity": 0.82,
          "raster-saturation": -0.35,
          "raster-contrast": 0.2
        }
      }
    ]
  };

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
  return Array.isArray(value) && value.length > 0 && value.every(isLinearRing);
}

function isGeoJsonFeature(value: unknown): value is GeoJSON.Feature<GeoJSON.Polygon> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const feature = value as Record<string, unknown>;
  const geometry = feature.geometry as Record<string, unknown> | null;

  return (
    feature.type === "Feature" &&
    typeof geometry === "object" &&
    geometry !== null &&
    geometry.type === "Polygon" &&
    isPolygonCoordinates(geometry.coordinates) &&
    typeof feature.properties === "object" &&
    feature.properties !== null
  );
}

function isGeoJsonFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const collection = value as Record<string, unknown>;
  return collection.type === "FeatureCollection" && Array.isArray(collection.features) && collection.features.every(isGeoJsonFeature);
}

function validateGeoJsonResponse(value: unknown): value is GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (!isGeoJsonFeatureCollection(value)) {
    console.error("Invalid GeoJSON response for /api/hexes", value);
    return false;
  }
  return true;
}

function applyDemoOwnership(data: GeoJSON.FeatureCollection<GeoJSON.Polygon>) {
  if (!isClientDemoMode) return data;
  const ownedByIndex = new globalThis.Map(getDemoOwnedHexes().map((hex) => [hex.h3Index, hex]));
  const territoryByIndex = new globalThis.Map(
    getDemoTerritories().flatMap((territory) => territory.hexIndexes.map((index) => [index, territory] as const))
  );
  return {
    ...data,
    features: data.features.map((feature) => {
      const h3Index = String(feature.properties?.h3Index ?? "");
      const owned = ownedByIndex.get(h3Index);
      if (!owned) return feature;
      const territory = territoryByIndex.get(h3Index);
      return {
        ...feature,
        id: owned.id,
        properties: {
          ...feature.properties,
          id: owned.id,
          ownerId: DEMO_USER.id,
          ownerName: DEMO_USER.name,
          ownerImage: owned.avatarUrl,
          title: owned.title,
          message: owned.message,
          imageUrl: owned.imageUrl,
          externalLink: owned.externalLink,
          priceCents: owned.priceCents,
          purchaseDate: owned.purchaseDate,
          status: "MY_OWNED",
          ...(territory ? {
            territoryId: territory.id,
            territoryName: territory.name,
            territoryColor: territory.color
          } : {})
        }
      };
    })
  } satisfies GeoJSON.FeatureCollection<GeoJSON.Polygon>;
}

type PersistedHexResponse = {
  hex: {
    id: string;
    h3Index: string;
    latitude: number | null;
    longitude: number | null;
    ownerName: string;
    ownerImage: string | null;
    avatarUrl: string | null;
    ownerFounderNumber: number | null;
    ownerKingdomUnlocked: boolean;
    title: string;
    message: string;
    imageUrl: string | null;
    externalLink: string | null;
    status: string;
    priceCents: number;
  } | null;
};

function selectedHexFromProperties(props: Record<string, string | number | null>): SelectedHex {
  const status = props.status ? String(props.status) : "AVAILABLE";
  return {
    h3Index: String(props.h3Index),
    lng: Number(props.longitude),
    lat: Number(props.latitude),
    purchased: status === "AVAILABLE" ? undefined : {
      id: String(props.id),
      ownerName: props.ownerName ? String(props.ownerName) : "Anonymous owner",
      ownerImage: props.ownerImage ? String(props.ownerImage) : null,
      ownerFounderNumber: props.ownerFounderNumber ? Number(props.ownerFounderNumber) : null,
      ownerKingdomUnlocked: Boolean(props.ownerKingdomUnlocked),
      title: props.title ? String(props.title) : "",
      message: props.message ? String(props.message) : "",
      imageUrl: props.imageUrl ? String(props.imageUrl) : null,
      externalLink: props.externalLink ? String(props.externalLink) : null,
      status,
      priceCents: Number(props.priceCents ?? 100)
    }
  };
}

async function loadPersistedSelection(selection: SelectedHex) {
  const response = await fetch(`/api/hexes/${encodeURIComponent(selection.h3Index)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Selected hex could not be loaded.");
  const data = (await response.json()) as PersistedHexResponse;
  if (!data.hex) return { ...selection, purchased: undefined };
  return {
    h3Index: data.hex.h3Index,
    lng: data.hex.longitude ?? selection.lng,
    lat: data.hex.latitude ?? selection.lat,
    purchased: {
      id: data.hex.id,
      ownerName: data.hex.ownerName,
      ownerImage: data.hex.ownerImage,
      avatarUrl: data.hex.avatarUrl,
      ownerFounderNumber: data.hex.ownerFounderNumber,
      ownerKingdomUnlocked: data.hex.ownerKingdomUnlocked,
      title: data.hex.title,
      message: data.hex.message,
      imageUrl: data.hex.imageUrl,
      externalLink: data.hex.externalLink,
      status: data.hex.status,
      priceCents: data.hex.priceCents
    }
  } satisfies SelectedHex;
}

function hexFillColorExpression(currentUserId: string): ExpressionSpecification {
  return [
    "case",
    ["has", "territoryColor"],
    ["get", "territoryColor"],
    ["==", ["get", "status"], "MY_OWNED"],
    "#22c55e",
    ["all", ["!=", ["get", "status"], "AVAILABLE"], ["==", ["get", "ownerId"], currentUserId]],
    "#8b5cf6",
    ["==", ["get", "status"], "SPECIAL"],
    "#a855f7",
    ["==", ["get", "status"], "FOR_SALE"],
    "#fbbf24",
    ["==", ["get", "status"], "GREEN_OWNED"],
    "#16a34a",
    ["==", ["get", "status"], "OWNED"],
    "#2563eb",
    "#0f172a"
  ] as ExpressionSpecification;
}

function hexFillOpacityExpression(): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "status"], "AVAILABLE"],
    0.22,
    0.75
  ] as ExpressionSpecification;
}

function hexLineColorExpression(): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "status"], "AVAILABLE"],
    "#334155",
    ["==", ["get", "status"], "FOR_SALE"],
    "#fde68a",
    ["==", ["get", "status"], "SPECIAL"],
    "#d8b4fe",
    ["==", ["get", "status"], "GREEN_OWNED"],
    "#86efac",
    "#93c5fd"
  ] as ExpressionSpecification;
}

function hexLineOpacityExpression(): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "status"], "AVAILABLE"],
    0.8,
    0.8
  ] as ExpressionSpecification;
}

function renderImageMarkers(
  map: Map,
  markerStore: MutableRefObject<maplibregl.Marker[]>,
  selectHex: (hex: SelectedHex | null) => void,
  data: GeoJSON.FeatureCollection<GeoJSON.Polygon>
) {
  markerStore.current.forEach((marker) => marker.remove());
  markerStore.current = [];
  if (map.getZoom() < 6) return;
  const bounds = map.getBounds();

  for (const feature of data.features) {
    const properties = feature.properties as Record<string, unknown> | null;
    const imageUrl = properties?.imageUrl ? String(properties.imageUrl) : "";
    const longitude = Number(properties?.longitude);
    const latitude = Number(properties?.latitude);
    if (!imageUrl || !Number.isFinite(longitude) || !Number.isFinite(latitude) || !bounds.contains([longitude, latitude])) continue;
    const element = document.createElement("button");
    element.type = "button";
    element.className = "demo-hex-thumbnail";
    element.title = String(properties?.title || "Open collectible hex");
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    element.appendChild(image);
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      selectHex({
        h3Index: String(properties?.h3Index),
        lng: longitude,
        lat: latitude,
        purchased: {
          id: String(properties?.id),
          ownerName: String(properties?.ownerName || "Anonymous owner"),
          ownerImage: properties?.ownerImage ? String(properties.ownerImage) : null,
          title: String(properties?.title || ""),
          message: String(properties?.message || ""),
          imageUrl,
          externalLink: properties?.externalLink ? String(properties.externalLink) : null,
          status: String(properties?.status || "OWNED"),
          priceCents: Number(properties?.priceCents ?? 100)
        }
      });
      map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 6), essential: true });
    });
    markerStore.current.push(new maplibregl.Marker({ element, anchor: "center" }).setLngLat([longitude, latitude]).addTo(map));
  }
}

export function EarthMap() {
  const { data: session } = useSession();
  const currentUserId = isClientDemoMode ? DEMO_USER.id : session?.user?.id ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const imageMarkersRef = useRef<maplibregl.Marker[]>([]);
  const requestRef = useRef(0);
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);
  const selectedHex = useMapStore((state) => state.selectedHex);
  const refreshToken = useMapStore((state) => state.refreshToken);
  const focusTarget = useMapStore((state) => state.focusTarget);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    console.log("EarthMap mounted");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkMapStyle,
      center: [0, 20],
      zoom: 1.4,
      minZoom: 1.2,
      maxZoom: 19,
      maxPitch: 60,
      renderWorldCopies: false,
      attributionControl: false
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.resize();

    function tintBaseMap() {
      if (!map.isStyleLoaded() || map.getLayer("pixel-world-ocean")) return;
      map.addLayer(
        {
          id: "pixel-world-ocean",
          type: "background",
          paint: {
            "background-color": "#071525",
            "background-opacity": 0.72
          }
        },
        map.getStyle().layers?.[0]?.id
      );
    }

    async function loadHexes() {
      if (!map.getSource(sourceId)) return;
      const requestId = ++requestRef.current;
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");

      try {
        const response = await fetch(`/api/hexes?bbox=${bbox}&zoom=${Math.round(map.getZoom())}&includeVirtual=1&take=10000`);
        const data = await response.json();
        if (requestId !== requestRef.current || !validateGeoJsonResponse(data)) return;
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        const decorated = applyDemoOwnership(data);
        source.setData(decorated);
        renderImageMarkers(map, imageMarkersRef, setSelectedHex, decorated);
      } catch (error) {
        console.error("/api/hexes load failed", error);
      }
    }

    async function loadTerritories() {
      if (!map.getSource(territorySourceId)) return;
      if (isClientDemoMode) return;
      try {
        const response = await fetch("/api/territories");
        const data = await response.json();
        if (!data?.geojson || data.geojson.type !== "FeatureCollection") return;
        const source = map.getSource(territorySourceId) as maplibregl.GeoJSONSource;
        source.setData(data.geojson);
      } catch (error) {
        console.error("/api/territories load failed", error);
      }
    }

    map.on("load", () => {
      tintBaseMap();
      map.resize();

      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addSource(selectedSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addSource(territorySourceId, {
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
          "fill-opacity": hexFillOpacityExpression()
        }
      });

      map.addLayer({
        id: outlineLayerId,
        source: sourceId,
        type: "line",
        minzoom: 0,
        paint: {
          "line-color": hexLineColorExpression(),
          "line-opacity": hexLineOpacityExpression(),
          "line-width": 0.6
        }
      });

      map.addLayer({
        id: territoryFillLayerId,
        source: territorySourceId,
        type: "fill",
        minzoom: 0,
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#22c55e"],
          "fill-opacity": 0.08
        }
      });

      map.addLayer({
        id: territoryLineLayerId,
        source: territorySourceId,
        type: "line",
        minzoom: 0,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#22c55e"],
          "line-opacity": 0.95,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.5, 5, 2.5, 10, 4]
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
      void loadTerritories();

      const requestedHex = new URLSearchParams(window.location.search).get("hex");
      if (requestedHex && isValidCell(requestedHex)) {
        const [lat, lng] = cellToLatLng(requestedHex);
        const selection: SelectedHex = { h3Index: requestedHex, lng, lat };
        setSelectedHex(selection);
        map.flyTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), 5.5),
          essential: true
        });
        if (!isClientDemoMode) {
          void loadPersistedSelection(selection)
            .then((persistedSelection) => {
              if (useMapStore.getState().selectedHex?.h3Index === persistedSelection.h3Index) {
                setSelectedHex(persistedSelection);
              }
            })
            .catch((error) => console.error("Callback hex lookup failed", error));
        }
      }
    });

    map.on("moveend", () => {
      void loadHexes();
    });

    map.on("mousemove", fillLayerId, (event) => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", fillLayerId, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", async (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [fillLayerId] });
      if (features[0]) {
        const props = features[0].properties as Record<string, string | number | null>;
        const lng = Number(props.longitude);
        const lat = Number(props.latitude);
        const selection = selectedHexFromProperties(props);
        setSelectedHex(selection);
        if (!isClientDemoMode) {
          void loadPersistedSelection(selection)
            .then((persistedSelection) => {
              if (useMapStore.getState().selectedHex?.h3Index === persistedSelection.h3Index) {
                setSelectedHex(persistedSelection);
              }
            })
            .catch((error) => console.error("Selected hex lookup failed", error));
        }

        const selectedSource = map.getSource(selectedSourceId) as maplibregl.GeoJSONSource;
        selectedSource.setData({
          type: "FeatureCollection",
          features: [
            (features[0] as any).toJSON
              ? (features[0] as any).toJSON()
              : (features[0] as GeoJSON.Feature)
            ]
        });
        map.flyTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), 5.5),
          essential: true
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
      map.flyTo({
        center: [event.lngLat.lng, event.lngLat.lat],
        zoom: Math.max(map.getZoom(), 5.5),
        essential: true
      });
    });

    return () => {
      imageMarkersRef.current.forEach((marker) => marker.remove());
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
    if (!map?.getLayer(fillLayerId)) return;
    map.setPaintProperty(fillLayerId, "fill-color", hexFillColorExpression(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(sourceId)) return;
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
    fetch(`/api/hexes?bbox=${bbox}&zoom=${Math.round(map.getZoom())}&includeVirtual=1&take=10000`)
      .then((response) => response.json())
      .then((data) => {
        if (!validateGeoJsonResponse(data)) return;
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        const decorated = applyDemoOwnership(data);
        source.setData(decorated);
        renderImageMarkers(map, imageMarkersRef, setSelectedHex, decorated);
      })
      .catch((error) => {
        console.error("/api/hexes refresh failed", error);
      });
    if (isClientDemoMode) return;
    fetch("/api/territories")
      .then((response) => response.json())
      .then((data) => {
        if (!data?.geojson || data.geojson.type !== "FeatureCollection") return;
        const source = map.getSource(territorySourceId) as maplibregl.GeoJSONSource;
        source?.setData(data.geojson);
      })
      .catch((error) => {
        console.error("/api/territories refresh failed", error);
      });
  }, [refreshToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.flyTo({
      center: [focusTarget.lng, focusTarget.lat],
      zoom: Math.max(map.getZoom(), 5.5),
      essential: true
    });
  }, [focusTarget]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#071525]" style={{ height: "100%", minHeight: 0, width: "100%" }}>
      <div ref={containerRef} className="h-full min-h-0 w-full" style={{ height: "100%", minHeight: 0, width: "100%" }} />
    </div>
  );
}
