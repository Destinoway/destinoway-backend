class BaseGateway {

  async createOrder(
    payload
  ){
    throw new Error(
      "Not implemented"
    );
  }

  async verifyPayment(
    payload
  ){
    throw new Error(
      "Not implemented"
    );
  }

  async refundPayment(
    payload
  ){
    throw new Error(
      "Not implemented"
    );
  }
}

export default BaseGateway;