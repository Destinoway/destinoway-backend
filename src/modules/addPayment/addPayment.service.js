import axios from "axios";
import { getAuthHeader } from "../../config/supplierApi.js";

export const addPaymentService = async ({
  BookingRefNo,
  transactionType = 0,
  productId = "26",
  clientRefNo = "Testing Praba",
  //IMEI_Number="2232323232323",
}) => {
  try {
    const payload = {
      Auth_Header: getAuthHeader(),
      ClientRefNo: clientRefNo,
      RefNo: BookingRefNo,
      TransactionType: transactionType,
      ProductId: productId,
    };


    const response = await axios.post(
      "http://uat.flyshop.in/TradeHost/TradeAPIService.svc/JSONService/AddPayment",
      payload,
    );

    return response.data;
  } catch (error) {

    if (error?.response) {
    } else {
    }


    throw new Error(
      error?.response?.data?.Message ||
        error?.response?.data?.ErrorMessage ||
        "Failed to add payment",
    );
  }
};
