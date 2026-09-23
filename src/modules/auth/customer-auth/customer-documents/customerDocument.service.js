import CustomerDocument from "./customerDocument.model.js";

export const getCustomerDocumentService = async (userId) => {
  let documents = await CustomerDocument.findOne({ userId });

  if (!documents) {
    documents = await CustomerDocument.create({ userId });
  }

  return documents;
};

export const updateCustomerDocumentService = async (userId, payload) => {
  let documents = await CustomerDocument.findOne({ userId });

  if (!documents) {
    documents = new CustomerDocument({ userId });
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] !== undefined) {
      documents[key] = payload[key];
    }
  });

  await documents.save();

  return documents;
};
