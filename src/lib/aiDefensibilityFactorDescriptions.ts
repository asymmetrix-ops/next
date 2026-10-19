/**
 * AI Defensibility Index — fixed factor descriptions (same for every company).
 * Shown in the ⓘ icon tooltip next to each factor name on the radar chart.
 * Edit the text here; keys match the radar factor keys in companyAiRisks.ts.
 * Draft wording, to be confirmed by Piero.
 */
export const AI_DEFENSIBILITY_FACTOR_DESCRIPTIONS: Record<string, string> = {
  data_moat:
    "How unique and hard to get the company's data is, for example proprietary, exclusive or hard-to-collect sources.",
  replic:
    "How hard it would be for AI or a competitor to rebuild the product from public or synthetic data. The harder it is, the higher the defensibility.",
  authority:
    "Whether the market treats the company's data as the reference standard, for example cited by regulators, benchmarks or contracts.",
  accuracy:
    "How costly errors are for customers. The higher the cost of being wrong, the less likely customers are to switch to cheaper AI-generated alternatives.",
  history:
    "How deep and long the company's history of data is. New entrants can't recreate history after the fact.",
  stakes:
    "The financial or strategic value of the decisions customers make using the data.",
  human:
    "How much the product relies on expert analysis and commentary that AI can't easily replicate.",
  workflow:
    "How deeply the product is built into customers' daily workflows, systems and integrations, which makes it costly to switch.",
  talent:
    "How strong the team is at building with AI to widen the moat rather than waiting for it to be eroded.",
};
