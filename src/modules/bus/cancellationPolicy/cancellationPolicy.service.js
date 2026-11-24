import { getAkbarCancellationPolicy } from "./adapters/akbar/api/cancellationPolicy.api.js";
import { mapAkbarCancellationPolicy } from "./adapters/akbar/mappers/cancellationPolicy.mapper.js";

export const getBusCancellationPolicyService = async (params) =>
  mapAkbarCancellationPolicy(await getAkbarCancellationPolicy(params));
