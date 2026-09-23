import Contact from "./contact.model.js";
import { queryBuilder } from "../../utils/queryBuilder.js";

// CREATE CONTACT
export const createContactService = async (payload) => {
  data.ticketId = `GR${Math.floor(100000 + Math.random() * 900000)}`;
  const contact = await Contact.create(payload);

  return contact;
};


export const getAllContactsAdminService = async (query) => {
  const result = await queryBuilder({
    model: Contact,
    query,

    // Search fields
    searchFields: ["BookingRefNo", "email"],

    // Filter fields
    filterFields: ["status"],

    // Sorting
    sortFields: ["createdAt", "updatedAt", "status"],

    defaultSort: { createdAt: -1 },

    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
  });

  return {
    contacts: result.data,
    pagination: {
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      pages: result.meta.totalPages,
      hasNextPage: result.meta.hasNextPage,
      hasPreviousPage: result.meta.hasPreviousPage,
    },
  };
};
// export const getAllContactsAdminService = async ({
//   page = 1,
//   limit = 10,
//   search,
//   status,
// }) => {
//   const query = {};

//   // filter by ticket number
//  if (search) {
//   query.$or = [
//     {
//       BookingRefNo: {
//         $regex: search,
//         $options: "i",
//       },
//     },
//     {
//       email: {
//         $regex: search,
//         $options: "i",
//       },
//     },
//   ];
// }

//   // optional status filter
//   if (status) {
//     query.status = status;
//   }

//   const contacts = await Contact.find(query)
//     .sort({ createdAt: -1 })
//     .skip((page - 1) * limit)
//     .limit(Number(limit));

//   const total = await Contact.countDocuments(query);

//   return {
//     contacts,
//     pagination: {
//       total,
//       page: Number(page),
//       limit: Number(limit),
//       pages: Math.ceil(total / limit),
//     },
//   };
// };

// GET ALL CONTACTS
export const getAllContactsService = async ({
  page = 1,
  limit = 10,
  UserId,
}) => {
  const skip = (page - 1) * limit;

  const contacts = await Contact.find({
    UserId,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Contact.countDocuments({
    UserId,
  });

  return {
    contacts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// GET SINGLE CONTACT
export const getSingleContactService = async (id, userId) => {
  const contact = await Contact.findOne({
    _id: id,
    UserId: userId,
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  return contact;
};

// UPDATE CONTACT
export const updateContactService = async (id, userId, payload) => {
  const contact = await Contact.findOneAndUpdate(
    {
      _id: id,
      UserId: userId,
    },
    payload,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!contact) {
    throw new Error("Contact not found");
  }

  return contact;
};

export const updateContactServiceAdmin = async (id, data) => {
  const contact = await Contact.findById(id);

  if (!contact) {
    throw new Error("Contact not found");
  }

  const updatedContact = await Contact.findByIdAndUpdate(
    id,
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  return updatedContact;
};

// DELETE CONTACT
export const deleteContactService = async (id, userId) => {
  const contact = await Contact.findOneAndDelete({
    _id: id,
    UserId: userId,
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  return true;
};
