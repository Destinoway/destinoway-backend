import HomeContent from "./homeContent.model.js";

// CREATE

export const createHomeContent = async (data) => {
  // only one banner allowed
  if (data.sectionType === "banner") {
    const existingBanner = await HomeContent.findOne({
      sectionType: "banner",
    });

    if (existingBanner) {
      throw new Error("Banner already exists. Please update existing banner.");
    }
  }

  const content = await HomeContent.create(data);

  return content;
};

// GET FOR WEBSITE

export const getHomeContent = async () => {
  const data = await HomeContent.find({
    isActive: true,
  }).sort({
    order: 1,
  });

  const response = {
    banner: null,
    placesAsPerYourVibe: {
      title: "Places As Per Your Vibe",
      sectionType: "vibe",
      categories: [],
    },
    topRatedHotels: {
      title: "Top Rated Hotels",
      sectionType: "topRatedHotels",
      items: [],
    },
    popularDestinations: {
      title: "Popular Destinations",
      sectionType: "popularDestinations",
      categories: [],
    },
  };

  data.forEach((item) => {
    switch (item.sectionType) {
      case "banner":
        response.banner = item;
        break;

      case "vibe":
        response.placesAsPerYourVibe.categories.push({
          _id: item._id,
          category: item.category,
          items: item.items,
          isActive: item.isActive,
        });
        break;

      case "topRatedHotels":
        response.topRatedHotels.items.push(...item.items);
        break;

      case "popularDestinations":
        response.popularDestinations.categories.push({
          _id: item._id,
          category: item.category,
          items: item.items,
          isActive: item.isActive,
        });
        break;
    }
  });

  return response;
};


export const updateHomeContent = async (id, data) => {
  return await HomeContent.findByIdAndUpdate(id, data, {
    new: true,
  });
};

export const getAdminHomeContent = async () => {
  const data = await HomeContent.find().sort({
    order: 1,
  });

  return data;
};

// DELETE

export const deleteHomeContent = async (id) => {
  return await HomeContent.findByIdAndDelete(id);
};
