import Counter from "../modules/common/counter.model.js";

export const getNextSequence = async (name, model = null, field = null) => {
  const counter = await Counter.findOne({ id: name });

  if (!counter && model && field) {
    const lastDoc = await model
      .findOne()
      .sort({ [field]: -1 })
      .select(field)
      .lean();

    const maxValue = lastDoc ? lastDoc[field] : 0;

    const newCounter = await Counter.create({
      id: name,
      seq: maxValue,
    });

    return newCounter.seq + 1;
  }

  const updated = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return updated.seq;
};
