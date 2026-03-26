export type StandardCompetitionPriceTier = {
  minParticipants: number;
  maxParticipants: number;
  pricePerPerson: number;
};

export const STANDARD_COMPETITION_PRICE_TIERS: StandardCompetitionPriceTier[] = [
  { minParticipants: 6, maxParticipants: 10, pricePerPerson: 25 },
  { minParticipants: 11, maxParticipants: 20, pricePerPerson: 21 },
  { minParticipants: 21, maxParticipants: 30, pricePerPerson: 19 },
  { minParticipants: 31, maxParticipants: 40, pricePerPerson: 16 },
];

export function getStandardCompetitionTier(participants: number): StandardCompetitionPriceTier | null {
  if (!Number.isInteger(participants)) {
    return null;
  }

  return (
    STANDARD_COMPETITION_PRICE_TIERS.find(
      (tier) => participants >= tier.minParticipants && participants <= tier.maxParticipants
    ) ?? null
  );
}

export function getStandardCompetitionPricePerPerson(participants: number): number | null {
  return getStandardCompetitionTier(participants)?.pricePerPerson ?? null;
}

export function getStandardCompetitionTotal(participants: number): number | null {
  const perPerson = getStandardCompetitionPricePerPerson(participants);
  if (perPerson === null) {
    return null;
  }
  return participants * perPerson;
}
