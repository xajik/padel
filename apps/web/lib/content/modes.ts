import type { ModeId } from "@padel/engine";

export interface ModeGuide {
  id: ModeId;
  title: string;
  /** Answer-first definition: quoted by search and answer engines (FR-7.4.4). */
  answer: string;
  players: string;
  bestFor: string;
  steps: string[];
  scoring: string;
  tips: string[];
  faq: { q: string; a: string }[];
  /** Example setup used for the schedule table on the guide. */
  example: { players: number; courts: number };
}

export const MODE_GUIDES: ModeGuide[] = [
  {
    id: "americano",
    title: "Padel Americano",
    answer:
      "Padel Americano is a social format where you change partner every round. Each match is played to a fixed number of points (usually 16, 21, 24 or 32), every player keeps the points their team scored, and the player with the most points at the end wins. With 8 players on 2 courts, everyone partners everyone once over 7 rounds.",
    players: "4–24 players, 1–6 courts",
    bestFor: "Mixed-level social games where everyone should play with everyone.",
    steps: [
      "Enter the players and choose the number of courts.",
      "Pick points per match, for example 24. A match ends when the two scores add up to 24 (e.g. 15–9).",
      "Each round the app pairs you with a new partner and new opponents. If there are more players than court places, sit-outs rotate fairly.",
      "After each match, both players on a team receive the points their team scored.",
      "When all rounds are played, the player with the most points wins.",
    ],
    scoring:
      "Individual. Your total is the sum of your team's points in every match you played. Ties are broken by point difference, then wins.",
    tips: [
      "24 points takes about 14 minutes per round. Use 16 points if you have limited court time.",
      "With 5, 9 or 13 players one person sits out each round. Turn on bye compensation so sit-outs don't cost points.",
      "Use the Average leaderboard if players end up with different numbers of matches.",
    ],
    faq: [
      {
        q: "How many rounds are in a padel Americano?",
        a: "With a multiple of 4 players and enough courts for everyone, a full rotation is players − 1 rounds (7 rounds for 8 players). With sit-outs, the app plans a whole number of sit-out cycles so everyone rests equally.",
      },
      {
        q: "How long does an Americano take?",
        a: "About 17 minutes per round at 24 points including changeover. 8 players on 2 courts (7 rounds) takes about 2 hours.",
      },
      {
        q: "What is the difference between Americano and Mexicano?",
        a: "Americano uses a fixed rotation so you partner everyone. Mexicano pairs players by current standings after round one, so matches become more even as the session goes on.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
  {
    id: "team-americano",
    title: "Team Americano",
    answer:
      "Team Americano is Americano with fixed partners: each pair plays a round-robin against every other pair, match points are added up per team, and the pair with the most points wins.",
    players: "2–12 pairs (4–24 players)",
    bestFor: "Couples nights, club leagues and groups that already have partners.",
    steps: [
      "Enter the pairs.",
      "Choose courts and points per match.",
      "Each round every pair meets a new opposing pair. Extra pairs sit out in turn.",
      "Points scored are added to the pair's total.",
    ],
    scoring: "Per team: total points scored, then point difference, then wins.",
    tips: ["With 4 pairs on 2 courts every pair meets every other pair in 3 rounds."],
    faq: [
      {
        q: "Can partners change in Team Americano?",
        a: "No. Partners are fixed for the whole session; only opponents rotate. Choose Americano if you want partners to rotate.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
  {
    id: "mexicano",
    title: "Padel Mexicano",
    answer:
      "Padel Mexicano starts like an Americano, but from round two players are grouped by the current leaderboard: on each court, 1st and 4th play against 2nd and 3rd. The best players meet each other, matches stay close, and the highest points total wins.",
    players: "4–24 players, 1–6 courts",
    bestFor: "Competitive groups with mixed levels who want close matches.",
    steps: [
      "Round one uses a balanced random draw.",
      "After every round, players are sorted by points.",
      "The top four play on court 1 (1st + 4th vs 2nd + 3rd), the next four on court 2, and so on.",
      "Sit-outs rotate fairly across the whole group.",
      "Play a fixed number of rounds or keep going until time runs out.",
    ],
    scoring: "Individual points, exactly like Americano. Editing an old score reshuffles rounds that haven't started yet.",
    tips: [
      "Mexicano works well open-ended: stop whenever the court booking ends.",
      "Seven rounds is a good default for a 2-hour session.",
    ],
    faq: [
      {
        q: "Why is it called Mexicano?",
        a: "It is a variation of the Americano format that pairs players by standings instead of a fixed rotation.",
      },
      {
        q: "Is Mexicano fair for weaker players?",
        a: "Yes. Pairing 1st with 4th balances each court, so everyone plays close matches against players of a similar level.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
  {
    id: "team-mexicano",
    title: "Team Mexicano",
    answer:
      "Team Mexicano keeps pairs together and, after the first round, matches each pair against the pair closest to them in the standings (1st vs 2nd, 3rd vs 4th, …).",
    players: "2–12 pairs (4–24 players)",
    bestFor: "Fixed teams that want competitive, evenly matched games.",
    steps: [
      "Enter the pairs and choose courts.",
      "Round one is drawn at random.",
      "Afterwards pairs are ranked and matched 1v2, 3v4 and so on, with the top match on court 1.",
    ],
    scoring: "Per team: total points, then point difference, then wins.",
    tips: ["Great for club ladders: the top court decides the winner."],
    faq: [
      {
        q: "What happens with an odd number of pairs?",
        a: "One pair sits out each round in turn. Bye compensation can credit their average points.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
  {
    id: "mixicano",
    title: "Mixicano",
    answer:
      "Mixicano is Mexicano for mixed groups. Players are split into two sides (for example men and women) and every team always has one player from each side. After round one, players are paired by standings within their side.",
    players: "Equal sides, 4–24 players",
    bestFor: "Mixed doubles socials.",
    steps: [
      "Tag each player with side A or side B. The sides must be equal.",
      "Every team pairs one side-A player with one side-B player.",
      "From round two, the best-ranked players of each side play on court 1, and so on.",
    ],
    scoring: "Individual points, like Mexicano.",
    tips: ["Rename the sides to whatever suits your group."],
    faq: [
      {
        q: "Do I need exactly equal numbers?",
        a: "Yes. Each team needs one player from each side, so both sides must have the same number of players.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
  {
    id: "beat-the-box",
    title: "Beat the Box",
    answer:
      "Beat the Box splits players into boxes of four, one per court. Each box plays all three partner combinations over three rounds. Then the box winner moves up one court and the last player moves down, and a new cycle begins.",
    players: "Multiples of 4 (one box per court)",
    bestFor: "Club nights with many courts and a sense of progression.",
    steps: [
      "Players are drawn into boxes of four; box 1 is the top court.",
      "Within a box everyone partners everyone once (3 rounds).",
      "After the cycle, the box winner moves up and the last player moves down.",
    ],
    scoring: "Individual points; box standings use points in the last cycle.",
    tips: ["Two cycles (6 rounds) is a good 2-hour session."],
    faq: [
      {
        q: "What happens in the top box?",
        a: "The winner of the top box stays there, and the last player of the bottom box stays at the bottom.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
  {
    id: "up-and-down",
    title: "Up & Down",
    answer:
      "Up & Down (also called King of the Court) is played across ranked courts: after every round the winners move up one court and the losers move down one, and partners are split so you play with someone new.",
    players: "4 players per court",
    bestFor: "Energetic sessions where the top court is the prize.",
    steps: [
      "Players start on random courts; court 1 is the top court.",
      "After each match the winning pair moves up and the losing pair moves down.",
      "On the new court, previous partners are split up.",
    ],
    scoring: "Individual points. Draws are settled by a coin toss.",
    tips: ["Use shorter matches (16 points) to keep movement between courts lively."],
    faq: [
      {
        q: "What do the winners on court 1 do?",
        a: "They stay on court 1 and split up to face the winners coming up from court 2.",
      },
    ],
    example: { players: 12, courts: 3 },
  },
  {
    id: "team-up-and-down",
    title: "Team Up & Down",
    answer:
      "Team Up & Down is Up & Down with fixed pairs: after every round the winning pair moves up one court and the losing pair moves down.",
    players: "2 pairs per court",
    bestFor: "Fixed teams who want a ladder feel.",
    steps: [
      "Enter the pairs; each court hosts two pairs.",
      "Winning pairs move up a court, losing pairs move down.",
    ],
    scoring: "Per team points.",
    tips: ["The pair that ends on court 1 with the most points wins."],
    faq: [
      {
        q: "Can I use Team Up & Down with one court?",
        a: "Yes, but with one court the same two pairs keep meeting. It works best with 2 or more courts.",
      },
    ],
    example: { players: 8, courts: 2 },
  },
];

export function modeGuide(id: string): ModeGuide | undefined {
  return MODE_GUIDES.find((m) => m.id === id);
}
