import { Dumbbell, Shield } from "lucide-react";
import type { Sport } from "@/app/lib/types";

type SportTabsProps = {
  activeSport: Sport;
  onChange: (sport: Sport) => void;
};

export function SportTabs({ activeSport, onChange }: SportTabsProps) {
  return (
    <div className="sport-tabs" role="tablist" aria-label="Sports">
      <button
        aria-selected={activeSport === "football"}
        onClick={() => onChange("football")}
        role="tab"
        type="button"
      >
        <Shield size={17} aria-hidden="true" />
        Football
      </button>
      <button
        aria-selected={activeSport === "basketball"}
        onClick={() => onChange("basketball")}
        role="tab"
        type="button"
      >
        <Dumbbell size={17} aria-hidden="true" />
        Basketball
      </button>
    </div>
  );
}
