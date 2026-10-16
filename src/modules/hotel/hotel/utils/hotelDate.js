const makeDateError = () => {
  const error = new Error(
    "Hotel dates must use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY format"
  );
  error.statusCode = 400;
  return error;
};

const toCanonicalDate = (year, month, day) => {
  const values = [year, month, day].map(Number);
  const [parsedYear, parsedMonth, parsedDay] = values;
  const date = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay));

  if (
    !Number.isInteger(parsedYear) ||
    parsedYear < 1000 ||
    date.getUTCFullYear() !== parsedYear ||
    date.getUTCMonth() + 1 !== parsedMonth ||
    date.getUTCDate() !== parsedDay
  ) {
    throw makeDateError();
  }

  return `${String(parsedYear).padStart(4, "0")}-${String(parsedMonth).padStart(2, "0")}-${String(parsedDay).padStart(2, "0")}`;
};

export const normalizeHotelDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toCanonicalDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate()
    );
  }

  if (typeof value !== "string") {
    throw makeDateError();
  }

  const input = value.trim();
  const isoDate = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDate) {
    return toCanonicalDate(isoDate[1], isoDate[2], isoDate[3]);
  }

  const monthFirstDate = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (monthFirstDate) {
    const [, first, second, year] = monthFirstDate;
    const firstNumber = Number(first);
    const secondNumber = Number(second);

    if (firstNumber > 12 && secondNumber <= 12) {
      return toCanonicalDate(year, second, first);
    }

    return toCanonicalDate(year, first, second);
  }

  throw makeDateError();
};

export const formatAkbarHotelDate = (value) => {
  const [year, month, day] = normalizeHotelDate(value).split("-");
  return `${month}/${day}/${year}`;
};
