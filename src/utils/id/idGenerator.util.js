import { getNextSequence } from "../sequence.util.js";

export const generatePrefixedId = async (
  sequenceName,
  prefix,
  padLength = 3
) => {
  const seq = await getNextSequence(sequenceName);

  return {
    numeric: seq,
    formatted: `${prefix}-${String(seq).padStart(padLength, "0")}`,
  };
};