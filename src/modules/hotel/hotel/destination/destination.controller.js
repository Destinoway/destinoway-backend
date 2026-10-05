import { searchDestinationService } from "./destination.service.js";

export const searchDestination = async (req, res) => {
  try {
    const { searchInput } = req.body;

    if (!searchInput?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search input is required",
      });
    }

    const data = await searchDestinationService(searchInput.trim());

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Destination Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search destination",
    });
  }
};