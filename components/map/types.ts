import type { Activity } from "@/services/activities";

export type PlacedActivity = Activity & { latitude: number; longitude: number };

export type ActivityMapProps = {
  activities: PlacedActivity[];
  selectedId: number | null;
  onSelect: (activity: PlacedActivity | null) => void;
};

/** Centre de la France, quand aucune activité n'a de position. */
export const FRANCE = { latitude: 46.6, longitude: 2.4, zoom: 5 };
