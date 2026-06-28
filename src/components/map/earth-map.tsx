"use client";

import { useEffect, useRef, useState } from "react";
import { cellToBoundary, cellToLatLng, isValidCell } from "h3-js";
import maplibregl, { Map, type ExpressionSpecification, type StyleSpecification } from "maplibre-gl";
import { useSession } from "next-auth/react";
import { Check, Layers3, SlidersHorizontal, X } from "lucide-react";
import { DEMO_USER, isClientDemoMode } from "@/lib/demo";
import { getDemoOwnedHexes } from "@/lib/demo-storage";
import { useMapStore, type SelectedHex } from "@/stores/map-store";

const sourceId = "earth-hexes";
const selectedSourceId = "earth-hex-selected";
const fillLayerId = "earth-hexes-fill";
const outlineLayerId = "earth-hexes-outline";
const selectedFillLayerId = "earth-hex-selected-fill";
const selectedLineLayerId = "earth-hex-selected-line";
type LayerVisibility = {
  images: boolean;
  hexGrid: boolean;
};

function applyLayerVisibility(map: Map, visibility: LayerVisibility) {
  const setVisibility = (layerIds: string[], visible: boolean) => {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  };
  setVisibility([fillLayerId, outlineLayerId], visibility.hexGrid);
}

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
  return {
    ...data,
    features: data.features.map((feature) => {
      const h3Index = String(feature.properties?.h3Index ?? "");
      const owned = ownedByIndex.get(h3Index);
      if (!owned) return feature;
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
          status: "MY_OWNED"
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
    ownerId: string;
    ownerName: string;
    ownerUsername: string | null;
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
    purchaseDate: string;
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
      ownerId: props.ownerId ? String(props.ownerId) : undefined,
      ownerName: props.ownerName ? String(props.ownerName) : "Anonymous owner",
      ownerUsername: props.ownerUsername ? String(props.ownerUsername) : null,
      ownerImage: props.ownerImage ? String(props.ownerImage) : null,
      ownerFounderNumber: props.ownerFounderNumber ? Number(props.ownerFounderNumber) : null,
      ownerKingdomUnlocked: Boolean(props.ownerKingdomUnlocked),
      title: props.title ? String(props.title) : "",
      message: props.message ? String(props.message) : "",
      imageUrl: props.imageUrl ? String(props.imageUrl) : null,
      externalLink: props.externalLink ? String(props.externalLink) : null,
      status,
      priceCents: Number(props.priceCents ?? 100),
      purchaseDate: props.purchaseDate ? String(props.purchaseDate) : undefined
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
      ownerId: data.hex.ownerId,
      ownerName: data.hex.ownerName,
      ownerUsername: data.hex.ownerUsername,
      ownerImage: data.hex.ownerImage,
      avatarUrl: data.hex.avatarUrl,
      ownerFounderNumber: data.hex.ownerFounderNumber,
      ownerKingdomUnlocked: data.hex.ownerKingdomUnlocked,
      title: data.hex.title,
      message: data.hex.message,
      imageUrl: data.hex.imageUrl,
      externalLink: data.hex.externalLink,
      status: data.hex.status,
      priceCents: data.hex.priceCents,
      purchaseDate: data.hex.purchaseDate
    }
  } satisfies SelectedHex;
}

function hexFillColorExpression(currentUserId: string): ExpressionSpecification {
  return [
    "case",
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
    ["boolean", ["feature-state", "hover"], false],
    ["case", ["==", ["get", "status"], "AVAILABLE"], 0.34, 0.86],
    ["==", ["get", "status"], "AVAILABLE"],
    0.22,
    0.75
  ] as ExpressionSpecification;
}

function hexLineColorExpression(): ExpressionSpecification {
  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    "#f8fafc",
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
    ["boolean", ["feature-state", "hover"], false],
    1,
    ["==", ["get", "status"], "AVAILABLE"],
    0.8,
    0.8
  ] as ExpressionSpecification;
}

type ImagePointCollection = GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, unknown>>;

function demoImageCollection(): ImagePointCollection {
  return {
    type: "FeatureCollection",
    features: getDemoOwnedHexes().flatMap((hex) => {
      if (!hex.imageUrl) return [];
      return [{
        type: "Feature" as const,
        id: hex.h3Index,
        geometry: { type: "Point" as const, coordinates: [hex.longitude, hex.latitude] },
        properties: {
          id: hex.id,
          h3Index: hex.h3Index,
          latitude: hex.latitude,
          longitude: hex.longitude,
          ownerId: hex.ownerId,
          ownerName: hex.ownerName,
          ownerImage: hex.avatarUrl,
          title: hex.title,
          message: hex.message,
          imageUrl: hex.imageUrl,
          externalLink: hex.externalLink,
          status: "MY_OWNED",
          priceCents: hex.priceCents,
          purchaseDate: hex.purchaseDate
        }
      }];
    })
  };
}

async function customImageCollectionForMap(map: Map) {
  if (isClientDemoMode) return demoImageCollection();
  const bounds = map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
  const response = await fetch(`/api/map-images?bbox=${bbox}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Custom hex images could not be loaded.");
  return (await response.json()) as ImagePointCollection;
}

function clearCustomImageCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext("2d");
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
}

function loadCanvasImage(url: string, cache: globalThis.Map<string, HTMLImageElement>) {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      cache.set(url, image);
      resolve(image);
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function renderCustomImageCanvas(
  map: Map,
  canvas: HTMLCanvasElement,
  data: ImagePointCollection,
  visible: boolean,
  imageCache: globalThis.Map<string, HTMLImageElement>,
  isCurrent: () => boolean
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const pixelRatio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (!visible) {
    context.clearRect(0, 0, width, height);
    return;
  }

  const drawable = await Promise.all(data.features.slice(0, 300).map(async (feature) => {
    const properties = feature.properties ?? {};
    const imageUrl = properties.imageUrl ? String(properties.imageUrl) : "";
    const h3Index = properties.h3Index ? String(properties.h3Index) : "";
    if (!imageUrl || !isValidCell(h3Index)) return null;
    const image = await loadCanvasImage(imageUrl, imageCache);
    return image ? { h3Index, image } : null;
  }));

  if (!isCurrent()) return;
  context.clearRect(0, 0, width, height);
  for (const item of drawable) {
    if (!item) continue;
    const points = cellToBoundary(item.h3Index).map(([lat, lng]) => map.project([lng, lat]));
    if (points.length < 3) continue;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const boxWidth = Math.max(...xs) - left;
    const boxHeight = Math.max(...ys) - top;
    if (boxWidth <= 0 || boxHeight <= 0) continue;

    const scale = Math.max(boxWidth / item.image.naturalWidth, boxHeight / item.image.naturalHeight);
    const drawWidth = item.image.naturalWidth * scale;
    const drawHeight = item.image.naturalHeight * scale;
    const drawX = left + (boxWidth - drawWidth) / 2;
    const drawY = top + (boxHeight - drawHeight) / 2;

    context.save();
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.clip();
    context.drawImage(item.image, drawX, drawY, drawWidth, drawHeight);
    context.restore();

    context.save();
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.strokeStyle = "rgba(134, 239, 172, 0.58)";
    context.lineWidth = 0.75;
    context.stroke();
    context.restore();
  }
}

export function EarthMap() {
  const { data: session } = useSession();
  const currentUserId = isClientDemoMode ? DEMO_USER.id : session?.user?.id ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const customImageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customImageDataRef = useRef<ImagePointCollection>({ type: "FeatureCollection", features: [] });
  const customImageCacheRef = useRef(new globalThis.Map<string, HTMLImageElement>());
  const imageDrawRef = useRef(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const requestRef = useRef(0);
  const imageRequestRef = useRef(0);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    images: true,
    hexGrid: true
  });
  const layerVisibilityRef = useRef(layerVisibility);
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
      attributionControl: false,
      dragRotate: false,
      touchPitch: false
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
        const take = window.innerWidth < 768 ? 4000 : 10000;
        const response = await fetch(`/api/hexes?bbox=${bbox}&zoom=${Math.round(map.getZoom())}&includeVirtual=1&take=${take}`);
        const data = await response.json();
        if (requestId !== requestRef.current || !validateGeoJsonResponse(data)) return;
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        const decorated = applyDemoOwnership(data);
        source.setData(decorated);
      } catch (error) {
        console.error("/api/hexes load failed", error);
      }
    }

    function drawCustomImages(data = customImageDataRef.current) {
      const canvas = customImageCanvasRef.current;
      if (!canvas) return;
      const drawId = ++imageDrawRef.current;
      void renderCustomImageCanvas(
        map,
        canvas,
        data,
        layerVisibilityRef.current.images,
        customImageCacheRef.current,
        () => drawId === imageDrawRef.current
      ).catch((error) => console.error("Custom hex image draw failed", error));
    }

    async function loadCustomImages() {
      const requestId = ++imageRequestRef.current;
      if (!layerVisibilityRef.current.images) {
        customImageDataRef.current = { type: "FeatureCollection", features: [] };
        clearCustomImageCanvas(customImageCanvasRef.current);
        return;
      }

      try {
        const data = await customImageCollectionForMap(map);
        if (requestId !== imageRequestRef.current) return;
        customImageDataRef.current = data;
        drawCustomImages(data);
      } catch (error) {
        console.error("Custom hex image refresh failed", error);
        clearCustomImageCanvas(customImageCanvasRef.current);
      }
    }

    map.on("load", () => {
      tintBaseMap();
      map.resize();

      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "h3Index"
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
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.1, 0.6]
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

      applyLayerVisibility(map, layerVisibilityRef.current);

      void loadHexes();
      void loadCustomImages();

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

    let moveEndTimer: number | null = null;
    const loadAfterMove = () => {
      if (moveEndTimer !== null) window.clearTimeout(moveEndTimer);
      moveEndTimer = window.setTimeout(() => {
        void loadHexes();
        void loadCustomImages();
      }, 180);
    };
    map.on("moveend", loadAfterMove);

    let imageFrame: number | null = null;
    const scheduleImageDraw = () => {
      if (imageFrame !== null) return;
      imageFrame = window.requestAnimationFrame(() => {
        imageFrame = null;
        drawCustomImages();
      });
    };
    map.on("move", scheduleImageDraw);
    map.on("resize", scheduleImageDraw);

    let hoveredFeatureId: string | number | null = null;

    map.on("mousemove", fillLayerId, (event) => {
      const featureId = event.features?.[0]?.id;
      if (featureId !== undefined && featureId !== hoveredFeatureId) {
        if (hoveredFeatureId !== null) {
          map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: false });
        }
        hoveredFeatureId = featureId;
        map.setFeatureState({ source: sourceId, id: featureId }, { hover: true });
      }
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", fillLayerId, () => {
      if (hoveredFeatureId !== null) {
        map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: false });
        hoveredFeatureId = null;
      }
      map.getCanvas().style.cursor = "";
    });

    map.on("click", async (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [fillLayerId] });
      if (features[0]) {
        const props = features[0].properties as Record<string, string | number | null>;
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

        return;
      }

      const response = await fetch("/api/hexes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lng: event.lngLat.lng, lat: event.lngLat.lat })
      });
      const data = await response.json();
      const selection = { h3Index: data.h3Index, lng: event.lngLat.lng, lat: event.lngLat.lat };
      setSelectedHex(selection);
    });

    return () => {
      if (imageFrame !== null) window.cancelAnimationFrame(imageFrame);
      if (moveEndTimer !== null) window.clearTimeout(moveEndTimer);
      imageDrawRef.current += 1;
      clearCustomImageCanvas(customImageCanvasRef.current);
      searchMarkerRef.current?.remove();
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
    const take = window.innerWidth < 768 ? 4000 : 10000;
    fetch(`/api/hexes?bbox=${bbox}&zoom=${Math.round(map.getZoom())}&includeVirtual=1&take=${take}`)
      .then((response) => response.json())
      .then((data) => {
        if (!validateGeoJsonResponse(data)) return;
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        const decorated = applyDemoOwnership(data);
        source.setData(decorated);
      })
      .catch((error) => {
        console.error("/api/hexes refresh failed", error);
      });
    if (layerVisibilityRef.current.images) {
      const requestId = ++imageRequestRef.current;
      void customImageCollectionForMap(map)
        .then((data) => {
          if (requestId !== imageRequestRef.current) return;
          customImageDataRef.current = data;
          const canvas = customImageCanvasRef.current;
          if (!canvas) return;
          const drawId = ++imageDrawRef.current;
          return renderCustomImageCanvas(map, canvas, data, true, customImageCacheRef.current, () => drawId === imageDrawRef.current);
        })
        .catch((error) => console.error("Custom hex image refresh failed", error));
    } else {
      clearCustomImageCanvas(customImageCanvasRef.current);
    }
  }, [currentUserId, refreshToken]);

  useEffect(() => {
    const map = mapRef.current;
    layerVisibilityRef.current = layerVisibility;
    if (map?.isStyleLoaded()) applyLayerVisibility(map, layerVisibility);
    if (!map) return;
    if (!layerVisibility.images) {
      imageDrawRef.current += 1;
      clearCustomImageCanvas(customImageCanvasRef.current);
      return;
    }
    const requestId = ++imageRequestRef.current;
    void customImageCollectionForMap(map)
      .then((data) => {
        if (requestId !== imageRequestRef.current) return;
        customImageDataRef.current = data;
        const canvas = customImageCanvasRef.current;
        if (!canvas) return;
        const drawId = ++imageDrawRef.current;
        return renderCustomImageCanvas(map, canvas, data, true, customImageCacheRef.current, () => drawId === imageDrawRef.current);
      })
      .catch((error) => console.error("Custom hex image refresh failed", error));
  }, [layerVisibility, setSelectedHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;

    if (focusTarget.bbox) {
      map.fitBounds(
        [[focusTarget.bbox[0], focusTarget.bbox[1]], [focusTarget.bbox[2], focusTarget.bbox[3]]],
        { padding: 72, maxZoom: focusTarget.zoom ?? 13, duration: 1200, essential: true }
      );
    } else {
      map.flyTo({
        center: [focusTarget.lng, focusTarget.lat],
        zoom: focusTarget.zoom ?? Math.max(map.getZoom(), 5.5),
        essential: true
      });
    }

    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;
    if (focusTarget.label) {
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 22 })
        .setText(focusTarget.label);
      const marker = new maplibregl.Marker({ color: "#22d3ee" })
        .setLngLat([focusTarget.lng, focusTarget.lat])
        .setPopup(popup)
        .addTo(map);
      marker.togglePopup();
      searchMarkerRef.current = marker;
    }
  }, [focusTarget]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#071525]" style={{ height: "100%", minHeight: 0, width: "100%" }}>
      <div ref={containerRef} className="h-full min-h-0 w-full" style={{ height: "100%", minHeight: 0, width: "100%" }} />
      <canvas ref={customImageCanvasRef} className="pointer-events-none absolute inset-0 z-[5] h-full w-full" aria-hidden="true" />
      <button
        type="button"
        aria-label={layersOpen ? "Close map layers" : "Open map layers"}
        aria-expanded={layersOpen}
        className="absolute right-3 top-[4.5rem] z-20 flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-[#071827]/94 text-slate-100 shadow-xl backdrop-blur md:hidden"
        onClick={() => setLayersOpen((open) => !open)}
      >
        {layersOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
      </button>
      <div className={`${layersOpen ? "block" : "hidden"} absolute right-3 top-[7.25rem] z-20 w-44 rounded-md border border-white/15 bg-[#071827]/96 p-2.5 shadow-xl backdrop-blur md:right-4 md:top-4 md:block md:w-48`}>
        <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase text-slate-300"><Layers3 className="h-3.5 w-3.5" /> Map layers</div>
        {([
          ["images", "User Images"],
          ["hexGrid", "Hex Grid"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={layerVisibility[key]}
            className="flex h-8 w-full items-center justify-between px-1 text-left text-xs text-slate-100 transition-colors hover:text-white"
            onClick={() => setLayerVisibility((current) => ({ ...current, [key]: !current[key] }))}
          >
            <span>{label}</span>
            <span className={`flex h-4 w-4 items-center justify-center border ${layerVisibility[key] ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-500 bg-transparent"}`}>
              {layerVisibility[key] ? <Check className="h-3 w-3" /> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
