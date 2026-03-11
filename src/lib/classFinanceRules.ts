export type TrainerShareTier = {
  minParticipants: number;
  maxParticipants: number | null;
  percent: number;
};

export type WorkshopCostSettings = {
  kitchenUsageRatePerHour: number;
  workshopContentRatePerParticipant: number;
};

function toMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(3));
}

export type WorkshopFinanceBreakdownInput = {
  grossRevenue: number;
  participantsCount: number;
  durationMinutes: number;
  materialsCostAmount: number;
  costSettings: WorkshopCostSettings;
  trainerShareTiers: TrainerShareTier[];
};

export type WorkshopFinanceBreakdown = {
  fixedCosts: {
    kitchenUsageRatePerHour: number;
    workshopContentRatePerParticipant: number;
    durationHours: number;
    kitchenUsageAmount: number;
    workshopContentAmount: number;
    total: number;
  };
  materialsCostAmount: number;
  trainerFee: {
    percent: number;
    baseAmount: number;
    amount: number;
  };
  noonFeeAmount: number;
  totalCostsAmount: number;
};

export function calculateWorkshopFinanceBreakdown(
  input: WorkshopFinanceBreakdownInput
): WorkshopFinanceBreakdown {
  const grossRevenue = toMoney(input.grossRevenue);
  const participantsCount = Math.max(0, Math.trunc(input.participantsCount));
  const durationHours = toMoney(Math.max(0, input.durationMinutes) / 60);
  const materialsCostAmount = toMoney(Math.max(0, input.materialsCostAmount));
  const kitchenUsageRatePerHour = Math.max(0, input.costSettings.kitchenUsageRatePerHour);
  const workshopContentRatePerParticipant = Math.max(0, input.costSettings.workshopContentRatePerParticipant);

  const matchedTier =
    input.trainerShareTiers.find((tier) => {
      const minParticipants = Math.max(0, Math.trunc(tier.minParticipants));
      const maxParticipants = tier.maxParticipants === null ? null : Math.max(minParticipants, Math.trunc(tier.maxParticipants));
      return participantsCount >= minParticipants && (maxParticipants === null || participantsCount <= maxParticipants);
    }) ?? input.trainerShareTiers[input.trainerShareTiers.length - 1];

  const trainerFeePercent = matchedTier ? Math.max(0, Math.min(100, matchedTier.percent)) : 0;
  const kitchenUsageAmount = toMoney(kitchenUsageRatePerHour * durationHours);
  const workshopContentAmount = toMoney(workshopContentRatePerParticipant * participantsCount);
  const fixedCostsTotal = toMoney(kitchenUsageAmount + workshopContentAmount);
  const trainerFeeBaseAmount = toMoney(grossRevenue - fixedCostsTotal - materialsCostAmount);
  const trainerFeeAmount = trainerFeeBaseAmount > 0 ? toMoney((trainerFeeBaseAmount * trainerFeePercent) / 100) : 0;
  const noonFeeAmount = toMoney(grossRevenue - fixedCostsTotal - materialsCostAmount - trainerFeeAmount);
  const totalCostsAmount = toMoney(fixedCostsTotal + materialsCostAmount + trainerFeeAmount);

  return {
    fixedCosts: {
      kitchenUsageRatePerHour,
      workshopContentRatePerParticipant,
      durationHours,
      kitchenUsageAmount,
      workshopContentAmount,
      total: fixedCostsTotal,
    },
    materialsCostAmount,
    trainerFee: {
      percent: trainerFeePercent,
      baseAmount: trainerFeeBaseAmount,
      amount: trainerFeeAmount,
    },
    noonFeeAmount,
    totalCostsAmount,
  };
}