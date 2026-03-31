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

export const BIRTHDAY_PARTY_BASE_INCLUDED_PARTICIPANTS = 16;
export const BIRTHDAY_PARTY_BASE_AMOUNT = 180;
export const BIRTHDAY_PARTY_ADDITIONAL_PERSON_AMOUNT = 10;

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

export function getBirthdayPartyTotal(participants: number): number | null {
  if (!Number.isInteger(participants) || participants < 1) return null;
  if (participants <= BIRTHDAY_PARTY_BASE_INCLUDED_PARTICIPANTS) return BIRTHDAY_PARTY_BASE_AMOUNT;
  return (
    BIRTHDAY_PARTY_BASE_AMOUNT +
    (participants - BIRTHDAY_PARTY_BASE_INCLUDED_PARTICIPANTS) * BIRTHDAY_PARTY_ADDITIONAL_PERSON_AMOUNT
  );
}
