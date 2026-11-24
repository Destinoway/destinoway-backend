export const mapAkbarCancellationPolicy = (response) => ({
  tui: response.tui,
  policies: response.policies.map((policy) => ({
    cancellationTime: policy.cancellationTime,
    cancellationCharges: policy.cancellationCharges,
    deductionPercentage: policy.deductionPercentage,
  })),
});
