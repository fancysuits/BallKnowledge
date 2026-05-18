import { getStatusLabel, getStatusTone } from "@/app/lib/statuses";

type StatusBadgeProps = {
  status?: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = getStatusTone(status);

  return <span className={`status-badge ${tone}`}>{getStatusLabel(status)}</span>;
}
