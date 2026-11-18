export default class BaseHotelPaymentAdapter {
  async createOrder() {
    throw new Error("Payment gateway must implement createOrder");
  }

  async verifyPayment() {
    throw new Error("Payment gateway must implement verifyPayment");
  }

  async getCheckoutDetails() {
    throw new Error("Payment gateway must implement getCheckoutDetails");
  }

  async refundPayment() {
    throw new Error("Payment gateway must implement refundPayment");
  }
}
