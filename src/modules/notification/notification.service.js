import { getFirebaseMessaging } from "../../config/firebase.js";
import User from "../user/user.model.js";
import NotificationDevice from "./notificationDevice.model.js";
import { Notification, NotificationRead } from "./notification.model.js";

const FCM_BATCH_SIZE = 100;
const UNREGISTERED_TARGETS = new Set([
  "messaging/installation-id-not-registered",
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export function upsertDeviceRegistration(userId, target, targetType) {
  return NotificationDevice.findOneAndUpdate(
    { fid: target },
    { $set: { userId, targetType } },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
}

function getMessagingTarget(device) {
  return device.targetType === "token" ? { token: device.fid } : { fid: device.fid };
}

export function deleteDeviceRegistration(userId, id) {
  return NotificationDevice.deleteOne({ _id: id, userId });
}

export function customerExists(customerId) {
  return User.exists({ _id: customerId, type: "customer" });
}

export async function publishNotification(userId, payload) {
  const item = await Notification.create({ userId, ...payload });
  const notificationId = item.id;
  const pushPayload = { ...payload, data: { ...payload.data, notificationId } };

  try {
    const result = userId === null
      ? await sendToAllCustomers(pushPayload)
      : await sendToCustomer(userId, pushPayload);
    return { notificationId, ...result };
  } catch (error) {
    console.warn("Saved notification push failed", { notificationId, code: error.code });
    return { notificationId, sent: null, failed: null };
  }
}

function inboxFilter(user) {
  const broadcast = { userId: null };
  if (user.createdAt) {
    broadcast.createdAt = { $gte: user.createdAt };
  }
  return { $or: [{ userId: user._id }, broadcast] };
}

export async function getInbox(user, { cursor, limit }) {
  const filter = inboxFilter(user);
  if (cursor) {
    filter._id = { $lt: cursor };
  }
  const items = await Notification.find(filter)
    .select("title body data createdAt")
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
  const page = items.slice(0, limit);
  const reads = await NotificationRead.find({
    userId: user._id,
    notificationId: { $in: page.map(({ _id }) => _id) },
  }).select("notificationId readAt").lean();
  const readTimes = new Map(reads.map(({ notificationId, readAt }) => [String(notificationId), readAt]));

  return {
    items: page.map(({ _id, ...item }) => ({
      id: String(_id),
      ...item,
      readAt: readTimes.get(String(_id)) ?? null,
    })),
    nextCursor: items.length > limit ? String(page.at(-1)._id) : null,
  };
}

export async function getUnreadCount(user) {
  const [total, read] = await Promise.all([
    Notification.countDocuments(inboxFilter(user)),
    NotificationRead.countDocuments({ userId: user._id }),
  ]);
  return Math.max(0, total - read);
}

export async function markNotificationRead(user, notificationId) {
  if (!await Notification.exists({ ...inboxFilter(user), _id: notificationId })) {
    return null;
  }
  const receipt = await NotificationRead.findOneAndUpdate(
    { userId: user._id, notificationId },
    { $setOnInsert: { readAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );
  return { id: notificationId, readAt: receipt.readAt };
}

export async function sendToCustomer(userId, { title, body, data }) {
  const devices = await NotificationDevice.find({ userId })
    .select("fid targetType updatedAt")
    .lean();
  const result = { sent: 0, failed: 0 };
  if (devices.length === 0) {
    return result;
  }

  const messaging = getFirebaseMessaging();
  for (const device of devices) {
    try {
      await messaging.send({
        ...getMessagingTarget(device),
        notification: { title, body },
        data,
      });
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      if (UNREGISTERED_TARGETS.has(error.code)) {
        await NotificationDevice.deleteOne({
          _id: device._id,
          userId,
          updatedAt: device.updatedAt,
        });
      } else {
        console.warn("Customer push failed", { code: error.code });
      }
    }
  }

  return result;
}

export async function sendToAllCustomers({ title, body, data }) {
  const result = { sent: 0, failed: 0 };
  const cursor = NotificationDevice.find().select("fid targetType updatedAt").lean().cursor();

  try {
    await cursor.eachAsync(async (devices) => {
      const messaging = getFirebaseMessaging();
      let batch;
      try {
        batch = await messaging.sendEach(devices.map((device) => ({
          ...getMessagingTarget(device),
          notification: { title, body },
          data,
        })));
      } catch (error) {
        result.failed += devices.length;
        console.warn("Broadcast push batch failed", { code: error.code });
        return;
      }

      result.sent += batch.successCount;
      result.failed += batch.failureCount;

      const staleDevices = devices.filter(
        (_, index) => UNREGISTERED_TARGETS.has(batch.responses[index].error?.code),
      );
      if (staleDevices.length > 0) {
        const registrations = staleDevices.map(({ _id, updatedAt }) => ({ _id, updatedAt }));
        await NotificationDevice.deleteMany({ $or: registrations }).catch((error) => {
          console.warn("Unregistered push device cleanup failed", { code: error.code });
        });
      }
    }, { batchSize: FCM_BATCH_SIZE });
  } finally {
    await cursor.close();
  }

  return result;
}
