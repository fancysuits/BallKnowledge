import type { MatchFilter } from "@/app/lib/types";

const filters: Array<{ label: string; value: MatchFilter }> = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Finished", value: "finished" }
];

type FilterBarProps = {
  activeFilter: MatchFilter;
  onChange: (filter: MatchFilter) => void;
};

export function FilterBar({ activeFilter, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar" aria-label="Match filters">
      {filters.map((filter) => (
        <button
          aria-pressed={activeFilter === filter.value}
          key={filter.value}
          onClick={() => onChange(filter.value)}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
