
import mongoose from "mongoose";

export const queryBuilder = async ({
  model,
  query = {},

  searchFields = [],
  filterFields = [],
  arrayFilterFields = [],
  sortFields = [],

  // --------------------------------------------------
  // Embedded Array Support
  // --------------------------------------------------
  arrayField = null,

  defaultSort = { createdAt: -1 },

  defaultPage = 1,
  defaultLimit = 10,
  maxLimit = 100,
}) => {
  const {
    search,
    page = defaultPage,
    limit = defaultLimit,
    sortBy,
    sortOrder,
    startDate,
    endDate,
  } = query;

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  let currentPage = parseInt(page, 10);

  if (!currentPage || currentPage < 1) {
    currentPage = defaultPage;
  }

  let currentLimit = parseInt(limit, 10);

  if (!currentLimit || currentLimit < 1) {
    currentLimit = defaultLimit;
  }

  currentLimit = Math.min(
    currentLimit,
    maxLimit
  );

  const skip =
    (currentPage - 1) * currentLimit;

  /*
  |--------------------------------------------------------------------------
  | SORT
  |--------------------------------------------------------------------------
  */

  let sort = defaultSort;

  if (
    sortBy &&
    sortFields.includes(sortBy)
  ) {
    sort = {
      [sortBy]:
        sortOrder === "asc" ? 1 : -1,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | NORMAL MODE
  |--------------------------------------------------------------------------
  |
  | Used by normal/root document APIs.
  |
  | arrayField === null
  |
  |--------------------------------------------------------------------------
  */

  if (!arrayField) {
    const mongoQuery = {};

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    if (
      search &&
      searchFields.length
    ) {
      mongoQuery.$or =
        searchFields.map((field) => ({
          [field]: {
            $regex: search,
            $options: "i",
          },
        }));
    }

    /*
    |--------------------------------------------------------------------------
    | FILTER
    |--------------------------------------------------------------------------
    */

    filterFields.forEach((field) => {
      const value = query[field];

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      let filterValue = value;

      /*
      |----------------------------------------------------------------------
      | BOOLEAN
      |----------------------------------------------------------------------
      */

      if (value === "true") {
        filterValue = true;
      }

      if (value === "false") {
        filterValue = false;
      }

      /*
      |----------------------------------------------------------------------
      | OBJECT ID
      |----------------------------------------------------------------------
      */

      if (
        typeof value === "string" &&
        mongoose.Types.ObjectId.isValid(value)
      ) {
        filterValue =
          new mongoose.Types.ObjectId(value);
      }

      mongoQuery[field] = filterValue;
    });

    /*
    |--------------------------------------------------------------------------
    | DATE FILTER
    |--------------------------------------------------------------------------
    */

    if (startDate || endDate) {
      mongoQuery.createdAt = {};

      if (startDate) {
        mongoQuery.createdAt.$gte =
          new Date(
            `${startDate}T00:00:00.000Z`
          );
      }

      if (endDate) {
        mongoQuery.createdAt.$lte =
          new Date(
            `${endDate}T23:59:59.999Z`
          );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | QUERY
    |--------------------------------------------------------------------------
    */

    const [data, total] =
      await Promise.all([
        model
          .find(mongoQuery)
          .sort(sort)
          .skip(skip)
          .limit(currentLimit)
          .lean(),

        model.countDocuments(
          mongoQuery
        ),
      ]);

    /*
    |--------------------------------------------------------------------------
    | META
    |--------------------------------------------------------------------------
    */

    const totalPages = Math.ceil(
      total / currentLimit
    );

    const meta = {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages,

      hasNextPage:
        currentPage < totalPages,

      hasPreviousPage:
        currentPage > 1,
    };

    return {
      data,
      meta,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | EMBEDDED ARRAY MODE
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | arrayField: "hotels"
  |
  | HotelSearch:
  |
  | {
  |   searchId: "...",
  |   cacheKey: "...",
  |
  |   hotels: [
  |     {...},
  |     {...}
  |   ]
  | }
  |
  |--------------------------------------------------------------------------
  */

  const mongoQuery = {};

  /*
  |--------------------------------------------------------------------------
  | ROOT DOCUMENT FILTER
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | filterFields: ["cacheKey"]
  |
  | This filters the parent HotelSearch document.
  |
  |--------------------------------------------------------------------------
  */

  filterFields.forEach((field) => {
    const value = query[field];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    let filterValue = value;

    /*
    |----------------------------------------------------------------------
    | BOOLEAN
    |----------------------------------------------------------------------
    */

    if (value === "true") {
      filterValue = true;
    }

    if (value === "false") {
      filterValue = false;
    }

    /*
    |----------------------------------------------------------------------
    | OBJECT ID
    |----------------------------------------------------------------------
    */

    if (
      typeof value === "string" &&
      mongoose.Types.ObjectId.isValid(value)
    ) {
      filterValue =
        new mongoose.Types.ObjectId(value);
    }

    mongoQuery[field] = filterValue;
  });

  /*
  |--------------------------------------------------------------------------
  | DATE FILTER
  |--------------------------------------------------------------------------
  */

  if (startDate || endDate) {
    mongoQuery.createdAt = {};

    if (startDate) {
      mongoQuery.createdAt.$gte =
        new Date(
          `${startDate}T00:00:00.000Z`
        );
    }

    if (endDate) {
      mongoQuery.createdAt.$lte =
        new Date(
          `${endDate}T23:59:59.999Z`
        );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | AGGREGATION PIPELINE
  |--------------------------------------------------------------------------
  */

  const pipeline = [];

  /*
  |--------------------------------------------------------------------------
  | MATCH ROOT DOCUMENT
  |--------------------------------------------------------------------------
  */

  if (
    Object.keys(mongoQuery).length
  ) {
    pipeline.push({
      $match: mongoQuery,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | UNWIND ARRAY
  |--------------------------------------------------------------------------
  */

  pipeline.push({
    $unwind: `$${arrayField}`,
  });

  /*
  |--------------------------------------------------------------------------
  | ARRAY SEARCH
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | search=taj
  |
  | Searches:
  |
  | hotels.name
  | hotels.city
  | hotels.address
  |
  |--------------------------------------------------------------------------
  */

  if (
    search &&
    searchFields.length
  ) {
    pipeline.push({
      $match: {
        $or: searchFields.map(
          (field) => ({
            [`${arrayField}.${field}`]: {
              $regex: search,
              $options: "i",
            },
          })
        ),
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ARRAY FILTERS
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | starCategory=5
  |
  | becomes:
  |
  | hotels.starCategory = 5
  |
  |--------------------------------------------------------------------------
  */

  if (
    arrayFilterFields.length
  ) {
    const arrayFilterQuery = {};

    arrayFilterFields.forEach(
      (field) => {
        const value = query[field];

        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return;
        }

        let filterValue = value;

        /*
        |--------------------------------------------------------------------
        | BOOLEAN
        |--------------------------------------------------------------------
        */

        if (value === "true") {
          filterValue = true;
        }

        if (value === "false") {
          filterValue = false;
        }

        /*
        |--------------------------------------------------------------------
        | NUMBER FIELDS
        |--------------------------------------------------------------------
        */

        if (
          [
            "starCategory",
            "pricing.totalAmount",
            "pricing.basicAmount",
            "pricing.tax",
            "pricing.serviceFee",
            "pricing.markup",
            "pricing.gst",
          ].includes(field)
        ) {
          filterValue = Number(value);
        }

        arrayFilterQuery[
          `${arrayField}.${field}`
        ] = filterValue;
      }
    );

    if (
      Object.keys(arrayFilterQuery)
        .length
    ) {
      pipeline.push({
        $match: arrayFilterQuery,
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PRICE RANGE FILTER
  |--------------------------------------------------------------------------
  |
  | minPrice=1000
  | maxPrice=5000
  |
  |--------------------------------------------------------------------------
  */

  const minPrice =
    query.minPrice;

  const maxPrice =
    query.maxPrice;

  if (
    minPrice !== undefined &&
    minPrice !== null &&
    minPrice !== ""
  ) {
    const priceQuery = {
      $gte: Number(minPrice),
    };

    if (
      maxPrice !== undefined &&
      maxPrice !== null &&
      maxPrice !== ""
    ) {
      priceQuery.$lte =
        Number(maxPrice);
    }

    pipeline.push({
      $match: {
        [`${arrayField}.pricing.totalAmount`]:
          priceQuery,
      },
    });
  } else if (
    maxPrice !== undefined &&
    maxPrice !== null &&
    maxPrice !== ""
  ) {
    pipeline.push({
      $match: {
        [`${arrayField}.pricing.totalAmount`]:
          {
            $lte: Number(maxPrice),
          },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | FACILITY FILTER
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | facility=WiFi
  |
  |--------------------------------------------------------------------------
  */

  if (
    query.facility
  ) {
    pipeline.push({
      $match: {
        [`${arrayField}.facilities.name`]: {
          $regex: query.facility,
          $options: "i",
        },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ARRAY SORT
  |--------------------------------------------------------------------------
  */

  if (
    sortBy &&
    sortFields.includes(sortBy)
  ) {
    pipeline.push({
      $sort: {
        [`${arrayField}.${sortBy}`]:
          sortOrder === "asc"
            ? 1
            : -1,
      },
    });
  } else {
    /*
    |----------------------------------------------------------------------
    | DEFAULT ARRAY SORT
    |----------------------------------------------------------------------
    */

    pipeline.push({
      $sort: {
        [`${arrayField}.name`]: 1,
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  pipeline.push({
    $skip: skip,
  });

  pipeline.push({
    $limit: currentLimit,
  });

  /*
  |--------------------------------------------------------------------------
  | RETURN ONLY ARRAY ITEM
  |--------------------------------------------------------------------------
  */

  pipeline.push({
    $replaceRoot: {
      newRoot: `$${arrayField}`,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | FETCH DATA
  |--------------------------------------------------------------------------
  */

  const data =
    await model.aggregate(
      pipeline
    );

  /*
  |--------------------------------------------------------------------------
  | COUNT PIPELINE
  |--------------------------------------------------------------------------
  |
  | Same filtering logic as main pipeline.
  |
  | No:
  |
  | $sort
  | $skip
  | $limit
  | $replaceRoot
  |
  |--------------------------------------------------------------------------
  */

  const countPipeline = [];

  /*
  |--------------------------------------------------------------------------
  | MATCH ROOT DOCUMENT
  |--------------------------------------------------------------------------
  */

  if (
    Object.keys(mongoQuery).length
  ) {
    countPipeline.push({
      $match: mongoQuery,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | UNWIND ARRAY
  |--------------------------------------------------------------------------
  */

  countPipeline.push({
    $unwind: `$${arrayField}`,
  });

  /*
  |--------------------------------------------------------------------------
  | SEARCH COUNT
  |--------------------------------------------------------------------------
  */

  if (
    search &&
    searchFields.length
  ) {
    countPipeline.push({
      $match: {
        $or: searchFields.map(
          (field) => ({
            [`${arrayField}.${field}`]: {
              $regex: search,
              $options: "i",
            },
          })
        ),
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ARRAY FILTER COUNT
  |--------------------------------------------------------------------------
  */

  if (
    arrayFilterFields.length
  ) {
    const arrayFilterQuery = {};

    arrayFilterFields.forEach(
      (field) => {
        const value = query[field];

        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return;
        }

        let filterValue = value;

        /*
        |--------------------------------------------------------------------
        | BOOLEAN
        |--------------------------------------------------------------------
        */

        if (value === "true") {
          filterValue = true;
        }

        if (value === "false") {
          filterValue = false;
        }

        /*
        |--------------------------------------------------------------------
        | NUMBER FIELDS
        |--------------------------------------------------------------------
        */

        if (
          [
            "starCategory",
            "pricing.totalAmount",
            "pricing.basicAmount",
            "pricing.tax",
            "pricing.serviceFee",
            "pricing.markup",
            "pricing.gst",
          ].includes(field)
        ) {
          filterValue =
            Number(value);
        }

        arrayFilterQuery[
          `${arrayField}.${field}`
        ] = filterValue;
      }
    );

    if (
      Object.keys(arrayFilterQuery)
        .length
    ) {
      countPipeline.push({
        $match: arrayFilterQuery,
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PRICE RANGE COUNT
  |--------------------------------------------------------------------------
  */

  if (
    minPrice !== undefined &&
    minPrice !== null &&
    minPrice !== ""
  ) {
    const priceQuery = {
      $gte: Number(minPrice),
    };

    if (
      maxPrice !== undefined &&
      maxPrice !== null &&
      maxPrice !== ""
    ) {
      priceQuery.$lte =
        Number(maxPrice);
    }

    countPipeline.push({
      $match: {
        [`${arrayField}.pricing.totalAmount`]:
          priceQuery,
      },
    });
  } else if (
    maxPrice !== undefined &&
    maxPrice !== null &&
    maxPrice !== ""
  ) {
    countPipeline.push({
      $match: {
        [`${arrayField}.pricing.totalAmount`]:
          {
            $lte: Number(maxPrice),
          },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | FACILITY COUNT
  |--------------------------------------------------------------------------
  */

  if (
    query.facility
  ) {
    countPipeline.push({
      $match: {
        [`${arrayField}.facilities.name`]: {
          $regex: query.facility,
          $options: "i",
        },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | COUNT
  |--------------------------------------------------------------------------
  */

  countPipeline.push({
    $count: "total",
  });

  const countResult =
    await model.aggregate(
      countPipeline
    );

  const total =
    countResult[0]?.total || 0;

  /*
  |--------------------------------------------------------------------------
  | META
  |--------------------------------------------------------------------------
  */

  const totalPages = Math.ceil(
    total / currentLimit
  );

  const meta = {
    page: currentPage,
    limit: currentLimit,
    total,
    totalPages,

    hasNextPage:
      currentPage < totalPages,

    hasPreviousPage:
      currentPage > 1,
  };

  /*
  |--------------------------------------------------------------------------
  | FINAL RESPONSE
  |--------------------------------------------------------------------------
  */

  return {
    data,
    meta,
  };
};

