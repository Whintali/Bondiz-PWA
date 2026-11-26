import { COLORS } from "@/constants/Colors";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef } from "react";
import { ActivityMapProps, FRANCE } from "./types";

// Repère violet en HTML : pas d'image à charger, et lisible au clavier
// (Leaflet rend chaque repère focalisable, nommé par son `title`).
const pin = (selected: boolean) =>
  L.divIcon({
    className: "bondiz-pin",
    html: `<span style="display:block;width:${selected ? 34 : 26}px;height:${selected ? 34 : 26}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${selected ? COLORS.yellow : COLORS.purple};border:3px solid ${COLORS.ink};box-shadow:0 2px 6px rgba(0,0,0,.3)"></span>`,
    iconSize: selected ? [34, 34] : [26, 26],
    iconAnchor: selected ? [17, 34] : [13, 26],
  });

const me = L.divIcon({
  className: "bondiz-me",
  html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2f80ed;border:3px solid white;box-shadow:0 0 0 6px rgba(47,128,237,.25)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function ActivityMap({ activities, selectedId, onSelect, userPosition }: ActivityMapProps & {
  userPosition?: { latitude: number; longitude: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const meMarker = useRef<L.Marker | null>(null);
  const fitted = useRef(false);
  // Les gestionnaires Leaflet gardent la dernière version de onSelect.
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: false, attributionControl: true }).setView(
      [FRANCE.latitude, FRANCE.longitude],
      FRANCE.zoom
    );
    L.control.zoom({ position: "topright" }).addTo(instance);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    instance.on("click", () => select.current(null));
    markers.current = L.layerGroup().addTo(instance);
    map.current = instance;

    // La carte est créée avant que la mise en page ne soit finie.
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);

    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const layer = markers.current;
    if (!instance || !layer) return;

    layer.clearLayers();
    for (const activity of activities) {
      const selected = activity.id === selectedId;
      L.marker([activity.latitude, activity.longitude], {
        icon: pin(selected),
        title: activity.title,
        alt: activity.title,
        zIndexOffset: selected ? 1000 : 0,
        keyboard: true,
      })
        .on("click", () => select.current(activity))
        .on("keypress", (event: L.LeafletKeyboardEvent) => {
          if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") select.current(activity);
        })
        .addTo(layer);
    }

    // Cadrage sur les activités au premier affichage seulement : ensuite,
    // l'utilisateur garde la vue qu'il a choisie.
    if (!fitted.current && activities.length > 0) {
      fitted.current = true;
      const bounds = L.latLngBounds(activities.map((activity) => [activity.latitude, activity.longitude]));
      instance.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    }
  }, [activities, selectedId]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    meMarker.current?.remove();
    meMarker.current = null;
    if (userPosition) {
      meMarker.current = L.marker([userPosition.latitude, userPosition.longitude], {
        icon: me,
        title: "Ma position",
        interactive: false,
        keyboard: false,
      }).addTo(instance);
      instance.setView([userPosition.latitude, userPosition.longitude], Math.max(instance.getZoom(), 13));
    }
  }, [userPosition]);

  return <div ref={container} data-testid="activity-map" style={{ width: "100%", height: "100%" }} />;
}
