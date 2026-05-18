type LoadingCardsProps = {
  count?: number;
};

export function LoadingCards({ count = 4 }: LoadingCardsProps) {
  return (
    <div className="match-grid" aria-label="Loading matches">
      {Array.from({ length: count }, (_, index) => (
        <div className="match-card loading-card" key={index}>
          <div className="skeleton short" />
          <div className="skeleton-row">
            <div className="skeleton avatar" />
            <div className="skeleton score" />
            <div className="skeleton avatar" />
          </div>
          <div className="skeleton long" />
        </div>
      ))}
    </div>
  );
}
