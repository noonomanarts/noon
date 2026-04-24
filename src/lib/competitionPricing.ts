export type StandardCompetitionPriceTier = {
  minParticipants: number;
  maxParticipants: number | null;
  pricePerPerson: number;
};

export const STANDARD_COMPETITION_PRICE_TIERS: StandardCompetitionPriceTier[] = [
  { minParticipants: 6, maxParticipants: 10, pricePerPerson: 25 },
  { minParticipants: 11, maxParticipants: 20, pricePerPerson: 21 },
  { minParticipants: 21, maxParticipants: 30, pricePerPerson: 19 },
  { minParticipants: 31, maxParticipants: 40, pricePerPerson: 16 },
];

export const PREMIUM_COMPETITION_PRICE_TIERS: StandardCompetitionPriceTier[] = [
  { minParticipants: 6, maxParticipants: 10, pricePerPerson: 33 },
  { minParticipants: 11, maxParticipants: 20, pricePerPerson: 30 },
  { minParticipants: 21, maxParticipants: 30, pricePerPerson: 27 },
  { minParticipants: 31, maxParticipants: 40, pricePerPerson: 24 },
];

export const PRIVATE_COOKING_CLASS_PRICE_TIERS: StandardCompetitionPriceTier[] = [
  { minParticipants: 6, maxParticipants: 10, pricePerPerson: 26 },
  { minParticipants: 11, maxParticipants: 18, pricePerPerson: 22 },
  { minParticipants: 19, maxParticipants: 25, pricePerPerson: 19 },
  { minParticipants: 26, maxParticipants: 32, pricePerPerson: 17 },
];

export const PRIVATE_ARTS_CRAFTS_CLASS_PRICE_TIERS: StandardCompetitionPriceTier[] = [
  { minParticipants: 6, maxParticipants: 12, pricePerPerson: 18 },
  { minParticipants: 13, maxParticipants: 20, pricePerPerson: 17 },
  { minParticipants: 21, maxParticipants: 30, pricePerPerson: 16 },
  { minParticipants: 31, maxParticipants: null, pricePerPerson: 15 },
];

export type BirthdayPartyPriceTier = {
  id: '6_9' | '10_16' | '17_24';
  minParticipants: number;
  maxParticipants: number;
  totalPrice: number;
  workMode: 'INDIVIDUAL' | 'PAIRS';
};

export const BIRTHDAY_PARTY_PRICE_TIERS: BirthdayPartyPriceTier[] = [
  { id: '6_9', minParticipants: 6, maxParticipants: 9, totalPrice: 180, workMode: 'INDIVIDUAL' },
  { id: '10_16', minParticipants: 10, maxParticipants: 16, totalPrice: 230, workMode: 'PAIRS' },
  { id: '17_24', minParticipants: 17, maxParticipants: 24, totalPrice: 280, workMode: 'PAIRS' },
];

function findTier(
  participants: number,
  tiers: StandardCompetitionPriceTier[]
): StandardCompetitionPriceTier | null {
  if (!Number.isInteger(participants)) {
    return null;
  }

  return (
    tiers.find(
      (tier) =>
        participants >= tier.minParticipants &&
        (tier.maxParticipants === null || participants <= tier.maxParticipants)
    ) ?? null
  );
}

function calculateTieredTotal(participants: number, tiers: StandardCompetitionPriceTier[]): number | null {
  const tier = findTier(participants, tiers);
  if (!tier) return null;
  return participants * tier.pricePerPerson;
}

export function getStandardCompetitionTier(participants: number): StandardCompetitionPriceTier | null {
  return findTier(participants, STANDARD_COMPETITION_PRICE_TIERS);
}

export function getStandardCompetitionPricePerPerson(participants: number): number | null {
  return getStandardCompetitionTier(participants)?.pricePerPerson ?? null;
}

export function getStandardCompetitionTotal(participants: number): number | null {
  return calculateTieredTotal(participants, STANDARD_COMPETITION_PRICE_TIERS);
}

export function getPremiumCompetitionTier(participants: number): StandardCompetitionPriceTier | null {
  return findTier(participants, PREMIUM_COMPETITION_PRICE_TIERS);
}

export function getPremiumCompetitionPricePerPerson(participants: number): number | null {
  return getPremiumCompetitionTier(participants)?.pricePerPerson ?? null;
}

export function getPremiumCompetitionTotal(participants: number): number | null {
  return calculateTieredTotal(participants, PREMIUM_COMPETITION_PRICE_TIERS);
}

export function getPrivateCookingClassTier(participants: number): StandardCompetitionPriceTier | null {
  return findTier(participants, PRIVATE_COOKING_CLASS_PRICE_TIERS);
}

export function getPrivateCookingClassPricePerPerson(participants: number): number | null {
  return getPrivateCookingClassTier(participants)?.pricePerPerson ?? null;
}

export function getPrivateCookingClassTotal(participants: number): number | null {
  return calculateTieredTotal(participants, PRIVATE_COOKING_CLASS_PRICE_TIERS);
}

export function getPrivateArtsCraftsClassTier(participants: number): StandardCompetitionPriceTier | null {
  return findTier(participants, PRIVATE_ARTS_CRAFTS_CLASS_PRICE_TIERS);
}

export function getPrivateArtsCraftsClassPricePerPerson(participants: number): number | null {
  return getPrivateArtsCraftsClassTier(participants)?.pricePerPerson ?? null;
}

export function getPrivateArtsCraftsClassTotal(participants: number): number | null {
  return calculateTieredTotal(participants, PRIVATE_ARTS_CRAFTS_CLASS_PRICE_TIERS);
}

export function getBirthdayPartyTier(participants: number): BirthdayPartyPriceTier | null {
  if (!Number.isInteger(participants)) {
    return null;
  }

  return (
    BIRTHDAY_PARTY_PRICE_TIERS.find(
      (tier) => participants >= tier.minParticipants && participants <= tier.maxParticipants
    ) ?? null
  );
}

export function getBirthdayPartyTierById(id: string): BirthdayPartyPriceTier | null {
  return BIRTHDAY_PARTY_PRICE_TIERS.find((tier) => tier.id === id) ?? null;
}

export function getBirthdayPartyTotal(participants: number): number | null {
  return getBirthdayPartyTier(participants)?.totalPrice ?? null;
}
