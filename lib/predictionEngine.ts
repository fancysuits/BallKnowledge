export function calculatePrediction(match: any) {
  let home = 33;
  let draw = 34;
  let away = 33;

  if (match.homeGoals > match.awayGoals) {
    home += 25;
    away -= 15;
    draw -= 10;
  }

  if (match.awayGoals > match.homeGoals) {
    away += 25;
    home -= 15;
    draw -= 10;
  }

  if (match.status === "1H" || match.status === "2H") {
    const elapsed = match.elapsed || 0;

    if (elapsed > 70 && match.homeGoals !== match.awayGoals) {
      draw -= 10;
    }

    if (elapsed > 80 && match.homeGoals === match.awayGoals) {
      draw += 15;
    }
  }

  const total = home + draw + away;

  return {
    homeWin: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    awayWin: Math.round((away / total) * 100),
  };
}