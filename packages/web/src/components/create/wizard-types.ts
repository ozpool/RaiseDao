/** A milestone as edited in the wizard — percent (0–100) for a friendly UI; it's
 *  converted to basis points only when saving to the API. */
export interface WizardMilestone {
  title: string;
  pct: number;
}

/** Everything the founder composes across the wizard steps. Numeric inputs are
 *  kept as strings while editing (empty, partial) and validated/coerced on save. */
export interface WizardData {
  title: string;
  summary: string;
  image: string;
  raiseTarget: string;
  fundingDurationDays: string;
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  milestones: WizardMilestone[];
}

export const INITIAL_DATA: WizardData = {
  title: '',
  summary: '',
  image: '',
  raiseTarget: '',
  fundingDurationDays: '30',
  tokenName: '',
  tokenSymbol: '',
  tokenSupply: '',
  milestones: [
    { title: '', pct: 50 },
    { title: '', pct: 50 },
  ],
};

const isPositiveNumber = (s: string) => /^\d+(\.\d+)?$/.test(s.trim()) && Number(s) > 0;

export const milestoneTotal = (milestones: WizardMilestone[]): number =>
  milestones.reduce((sum, m) => sum + (Number.isFinite(m.pct) ? m.pct : 0), 0);

/** Per-step validity, so the wizard can gate Next and the review can flag gaps. */
export function validateStep(step: number, d: WizardData): boolean {
  switch (step) {
    case 0:
      return d.title.trim().length > 0;
    case 1:
      return (
        isPositiveNumber(d.raiseTarget) &&
        isPositiveNumber(d.fundingDurationDays) &&
        d.tokenName.trim().length > 0 &&
        d.tokenSymbol.trim().length > 0 &&
        isPositiveNumber(d.tokenSupply)
      );
    case 2:
      return (
        d.milestones.length > 0 &&
        d.milestones.every((m) => m.title.trim().length > 0) &&
        milestoneTotal(d.milestones) === 100
      );
    default:
      return true;
  }
}

/** Shape the wizard data into the API's draft payload (percent → basis points). */
export function toDraftPayload(d: WizardData) {
  return {
    title: d.title.trim(),
    summary: d.summary.trim(),
    image: d.image.trim(),
    raiseTarget: d.raiseTarget.trim(),
    fundingDurationDays: Number(d.fundingDurationDays),
    tokenName: d.tokenName.trim(),
    tokenSymbol: d.tokenSymbol.trim().toUpperCase(),
    tokenSupply: d.tokenSupply.trim(),
    milestones: d.milestones.map((m) => ({
      title: m.title.trim(),
      pctBps: Math.round(m.pct * 100),
    })),
  };
}
