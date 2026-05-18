import { BarChart3, RefreshCw } from "lucide-react";
import { formatLastUpdated } from "@/app/lib/format";
import type { Sport } from "@/app/lib/types";

type HeaderProps = {
  activeSport: Sport;
  isRefreshing: boolean;
  lastUpdated: string | null;
  onRefresh: () => void;
};

export function Header({
  activeSport,
  isRefreshing,
  lastUpdated,
  onRefresh
}: HeaderProps) {
  return (
    <header className="page-header">
      <div className="brand-lockup">
        <div className="brand-mark">
          <BarChart3 size={22} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Ballknowledge</p>
          <h1>Sports Intelligence Desk</h1>
        </div>
      </div>

      <div className="header-actions">
        <div className="last-updated">
          <span>{activeSport === "football" ? "Football" : "Basketball"}</span>
          <strong>Last updated {formatLastUpdated(lastUpdated)}</strong>
        </div>
        <button
          className="icon-button"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>
    </header>
  );
}
