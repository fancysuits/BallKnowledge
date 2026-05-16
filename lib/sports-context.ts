import {
  basketballLeagues,
  getBasketballBundle
} from "@/lib/services/basketball";
import { getSoccerBundle, soccerLeagues } from "@/lib/services/soccer";
import type { SportsContext } from "@/lib/types/sports";

export async function buildSportsContext(question: string): Promise<SportsContext> {
  const lowerQuestion = question.toLowerCase();
  const wantsBasketball =
    lowerQuestion.includes("nba") ||
    lowerQuestion.includes("basketball") ||
    lowerQuestion.includes("celtics") ||
    lowerQuestion.includes("nuggets") ||
    lowerQuestion.includes("lakers") ||
    lowerQuestion.includes("knicks");
  const wantsSoccer =
    lowerQuestion.includes("soccer") ||
    lowerQuestion.includes("football") ||
    lowerQuestion.includes("premier") ||
    lowerQuestion.includes("liga") ||
    lowerQuestion.includes("arsenal") ||
    lowerQuestion.includes("city") ||
    lowerQuestion.includes("real madrid") ||
    lowerQuestion.includes("barcelona");

  const includeSoccer = wantsSoccer || !wantsBasketball;
  const includeBasketball = wantsBasketball || !wantsSoccer;

  const [soccer, basketball] = await Promise.all([
    includeSoccer ? getSoccerBundle(question) : null,
    includeBasketball ? getBasketballBundle(question) : null
  ]);

  return {
    leagues: [
      ...(includeSoccer ? soccerLeagues : []),
      ...(includeBasketball ? basketballLeagues : [])
    ],
    fixtures: [...(soccer?.fixtures || []), ...(basketball?.fixtures || [])],
    standings: [...(soccer?.standings || []), ...(basketball?.standings || [])],
    teamStatistics: [
      ...(soccer?.teamStatistics || []),
      ...(basketball?.teamStatistics || [])
    ],
    matchStatistics: [
      ...(soccer?.matchStatistics || []),
      ...(basketball?.matchStatistics || [])
    ],
    providerNotes: [
      ...(soccer?.providerNotes || []),
      ...(basketball?.providerNotes || [])
    ]
  };
}
