import TaxRule from "./tax.model.js";
import {
  sendSuccess,
  sendError,
} from "../../utils/response/ApiResponse.js";



/*
 CREATE TAX
*/
export const createTaxRule = async (req, res) => {
  try {
    const {
      countryCode,
      serviceType,
      ruleType,
      slabs,
    } = req.body;

    const existing = await TaxRule.findOne({
      countryCode,
      serviceType,
    });

    if (existing) {
      return sendError(
        res,
        "Tax rule already exists",
        400
      );
    }

    // slab validation
    if (ruleType === "slab") {

      if (!slabs || slabs.length === 0) {
        return sendError(
          res,
          "Slabs required",
          400
        );
      }

      // sort ascending
      const sortedSlabs = [...slabs].sort(
        (a, b) => a.minAmount - b.minAmount
      );

      // duplicate threshold check
      for (let i = 0; i < sortedSlabs.length - 1; i++) {
        if (
          sortedSlabs[i].minAmount ===
          sortedSlabs[i + 1].minAmount
        ) {
          return sendError(
            res,
            "Duplicate minAmount found",
            400
          );
        }
      }
    }

    const tax = await TaxRule.create(req.body);

    return sendSuccess(
      res,
      "Tax rule created",
      tax
    );

  } catch (err) {
    return sendError(
      res,
      "Failed",
      500,
      err.message
    );
  }
};


export const getAllTaxRules = async (req, res) => {
  try {
    const {
      countryCode,
      serviceType,
      isActive,
      search,
    } = req.query;

    const pipeline = [];

    // filters
    if (countryCode) {
      pipeline.push({
        $match: { countryCode },
      });
    }

    if (serviceType) {
      pipeline.push({
        $match: { serviceType },
      });
    }

    if (isActive !== undefined) {
      pipeline.push({
        $match: {
          isActive: isActive === "true",
        },
      });
    }

    // country lookup
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
          phoneCode: "$countryData.phoneCode",
        },
      }
    );

    // search
    if (search) {
      const regex = new RegExp(search, "i");

      pipeline.push({
        $match: {
          $or: [
            { countryCode: regex },
            { countryName: regex },
            { serviceType: regex },
          ],
        },
      });
    }

    // cleanup + sort
    pipeline.push(
      {
        $project: {
          countryData: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      }
    );

    const taxes = await TaxRule.aggregate(pipeline);

    return sendSuccess(
      res,
      "Tax rules fetched successfully",
      taxes
    );

  } catch (err) {
    return sendError(
      res,
      "Failed to fetch tax rules",
      500,
      err.message
    );
  }
};
/*
 UPDATE
*/
export const updateTaxRule = async (req, res) => {
  try {
    const tax = await TaxRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!tax) {
      return sendError(
        res,
        "Tax not found",
        404
      );
    }

    return sendSuccess(
      res,
      "Updated successfully",
      tax
    );
  } catch (err) {
    return sendError(
      res,
      "Failed",
      500,
      err.message
    );
  }
};


/*
 DELETE
*/
export const deleteTaxRule = async (req, res) => {
  try {
    const tax = await TaxRule.findByIdAndDelete(
      req.params.id
    );

    if (!tax) {
      return sendError(
        res,
        "Tax not found",
        404
      );
    }

    return sendSuccess(
      res,
      "Deleted successfully"
    );
  } catch (err) {
    return sendError(
      res,
      "Failed",
      500,
      err.message
    );
  }
};


/*
 TOGGLE STATUS
*/
export const toggleTaxStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const tax = await TaxRule.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!tax) {
      return sendError(
        res,
        "Tax not found",
        404
      );
    }

    return sendSuccess(
      res,
      "Status updated",
      tax
    );
  } catch (err) {
    return sendError(
      res,
      "Failed",
      500,
      err.message
    );
  }
};