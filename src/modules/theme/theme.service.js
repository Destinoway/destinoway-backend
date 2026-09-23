import Theme from "./theme.model.js";

let themeCache = null;

export const getThemeService = async () => {
  if (themeCache) {
    return themeCache;
  }

  const theme = await Theme.findOne({
    isActive: true,
  }).lean();

  themeCache = theme;

  return theme;
};

export const updateThemeService = async (data) => {
  const theme = await Theme.findOneAndUpdate(
    {},
    data,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  // Update memory cache
  themeCache = theme;

  return theme;
};

export const deleteThemeService = async () => {
  const result = await Theme.deleteMany({});

  // Clear memory cache
  themeCache = null;

  return result;
};