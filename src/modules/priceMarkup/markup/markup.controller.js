import { sendError, sendSuccess } from "../../../utils/response/ApiResponse.js";
import Markup from "./markup.model.js";

// import { paginateHotels } from "../../hotel/hotelPagination.js";

export const getAllMarkups = async (req, res) => {
  try {
    const { level, search, isActive, page = 1, limit = 10 } = req.query;

    const pipeline = [];

    // 1️⃣ Level filter
    if (level) {
      pipeline.push({
        $match: { level },
      });
    }

    // 2️⃣ isActive filter
    if (isActive !== undefined) {
      pipeline.push({
        $match: {
          isActive: isActive === "true",
        },
      });
    }

    // 3️⃣ Join countries collection
    pipeline.push(
      {
        $lookup: {
          from: "countries",
          localField: "countryCode",
          foreignField: "countryCode",
          as: "countryData",
        },
      },
      {
        $unwind: {
          path: "$countryData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          countryName: "$countryData.countryName",
        },
      },
    );

    // 4️⃣ Dynamic SEARCH based on level
    if (search) {
      const regex = new RegExp(search, "i");

      let searchMatch = {};

      if (level === "country") {
        searchMatch = { countryName: regex };
      }

      if (level === "state") {
        searchMatch = { stateName: regex };
      }

      if (level === "city") {
        searchMatch = { cityName: regex };
      }

      if (level === "hotel") {
        searchMatch = {
          $or: [{ hotelName: regex }, { hotelId: regex }],
        };
      }

      if (Object.keys(searchMatch).length > 0) {
        pipeline.push({
          $match: searchMatch,
        });
      }
    }

    // 5️⃣ Remove extra join data
    pipeline.push({
      $project: {
        countryData: 0,
      },
    });

    // 6️⃣ Sort latest first
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });

    // 🔥 Fetch all records
    const allMarkups = await Markup.aggregate(pipeline);

    // 🔥 Apply pagination
    const paginatedData = paginateHotels(allMarkups, {
      page: Number(page),
      limit: Number(limit),
    });

    return sendSuccess(
      res,
      "Markups fetched successfully",
      paginatedData.hotels,
      {
        page: paginatedData.page,
        limit: paginatedData.limit,
        totalPages: paginatedData.totalPages,
        totalRecords: paginatedData.totalHotels,
      },
    );
  } catch (err) {
    console.error(err);

    return sendError(res, "Failed to fetch markups", 500, err.message);
  }
};

export const createMarkup = async (req, res) => {
  try {
    const {
      level,
      countryCode,
      stateName,
      cityId,
      hotelId,
      startDate,
      endDate,
     
    } = req.body;

    // ✅ Date validation
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        return sendError(
          res,
          "Start date cannot be greater than end date",
          400
        );
      }
    }

    // ✅ Auto active logic
    const now = new Date();

    let autoActive = true;

    if (startDate && endDate) {
      autoActive =
        new Date(startDate) <= now &&
        new Date(endDate) >= now;
    }

    // 🔎 uniqueness filter
    let filter = { level};

    if (level === "country") filter.countryCode = countryCode;

    if (level === "state") {
      filter.countryCode = countryCode;
      filter.stateName = stateName;
    }

    if (level === "city") filter.cityId = cityId;

    if (level === "hotel") filter.hotelId = hotelId;

    // 🔴 existing check
    const existing = await Markup.findOne(filter);

    if (existing) {
      return sendError(
        res,
        "Markup already exists. Please update existing markup.",
        400
      );
    }

    // ✅ create
    const markup = await Markup.create({
      ...req.body,
      isActive: autoActive,
    });

    return sendSuccess(
      res,
      "Markup created successfully",
      markup,
      null,
      201
    );

  } catch (err) {
    return sendError(res, "Failed to create markup", 500, err.message);
  }
};
export const updateMarkup = async (req, res) => {
  try {
    const {
      level,
      markupType,
      markupValue,
      isActive,
      serviceChargeValue,
      startDate,
      endDate,
    } = req.body;

    // ✅ Required fields
    if (!level || !markupType || markupValue === undefined) {
      return sendError(res, "All fields are required for PUT", 400);
    }

    // ✅ Date validation
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        return sendError(
          res,
          "Start date cannot be greater than end date",
          400
        );
      }
    }

    // ✅ Convert dates properly
    let formattedStartDate = startDate
      ? new Date(startDate)
      : null;

    let formattedEndDate = endDate
      ? new Date(endDate)
      : null;

    // ✅ Full end day support
    if (formattedEndDate) {
      formattedEndDate.setHours(23, 59, 59, 999);
    }

    // ✅ Current time
    const now = new Date();

    // ✅ Manual status default true
    const manualStatus = isActive ?? true;

    // ✅ Date range validation
    const withinDateRange =
      !formattedStartDate ||
      !formattedEndDate ||
      (
        formattedStartDate <= now &&
        formattedEndDate >= now
      );

    // ✅ Final status
    const finalStatus =
      manualStatus && withinDateRange;

    // ✅ Update
    const markup = await Markup.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,

        startDate: formattedStartDate,
        endDate: formattedEndDate,

        isActive: finalStatus,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // ✅ Not found
    if (!markup) {
      return sendError(res, "Markup not found", 404);
    }

    return sendSuccess(
      res,
      "Markup fully updated",
      markup
    );

  } catch (err) {
    return sendError(
      res,
      "Failed to update markup",
      500,
      err.message
    );
  }
};

export const toggleMarkupStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return sendError(res, "isActive must be true/false", 400);
    }

    const markup = await Markup.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true },
    );

    if (!markup) return sendError(res, "Markup not found", 404);

    return sendSuccess(res, "Status updated successfully", markup);
  } catch (err) {
    return sendError(res, "Failed to update status", 500, err.message);
  }
};
export const deleteMarkup = async (req, res) => {
  try {
    const markup = await Markup.findByIdAndDelete(req.params.id);

    if (!markup) {
      return sendError(res, "Markup not found", 404);
    }

    return sendSuccess(res, "Markup deleted successfully");
  } catch (err) {
    return sendError(res, "Failed to delete markup", 500, err.message);
  }
};
