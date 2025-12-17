import type { BuildingKey, CityEntity } from "../data/cityLayout";
import { CITY_LAYOUT } from "../data/cityLayout";

type MiniMapProps = {
  selectedKey: BuildingKey | null;
};

const bounds = CITY_LAYOUT.reduce(
  (acc, entry) => {
    acc.minX = Math.min(acc.minX, entry.position.x);
    acc.maxX = Math.max(acc.maxX, entry.position.x);
    acc.minZ = Math.min(acc.minZ, entry.position.z);
    acc.maxZ = Math.max(acc.maxZ, entry.position.z);
    return acc;
  },
  {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  }
);

const normalize = (entry: CityEntity) => {
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxZ - bounds.minZ || 1;
  return {
    left: ((entry.position.x - bounds.minX) / width) * 100,
    top: ((entry.position.z - bounds.minZ) / height) * 100,
  };
};

const MiniMap = ({ selectedKey }: MiniMapProps) => (
  <div className="mini-map">
    {CITY_LAYOUT.map((entry) => {
      const { left, top } = normalize(entry);
      const isMain = entry.type === "main";
      const isActive = isMain && entry.key === selectedKey;
      return (
        <span
          key={entry.id}
          className={`mini-map-dot ${isMain ? "main" : "decor"} ${isActive ? "active" : ""}`}
          style={{ left: `${left}%`, top: `${top}%` }}
          title={entry.name}
        />
      );
    })}
  </div>
);

export default MiniMap;
