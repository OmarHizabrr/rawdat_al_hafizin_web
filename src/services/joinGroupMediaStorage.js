import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase.js";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function fileExt(file) {
  const byName = file?.name?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(byName || "")) {
    return byName === "jpeg" ? "jpg" : byName;
  }
  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  if (file?.type === "image/gif") return "gif";
  return "jpg";
}

export function assertJoinGroupImage(file) {
  if (!file || !(file instanceof File)) throw new Error("JOIN_GROUP_IMAGE_INVALID");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("JOIN_GROUP_IMAGE_TYPE");
  if (file.size > MAX_BYTES) throw new Error("JOIN_GROUP_IMAGE_TOO_LARGE");
}

export async function uploadJoinGroupImage(actorUid, file) {
  if (!actorUid) throw new Error("JOIN_GROUP_IMAGE_INVALID");
  assertJoinGroupImage(file);
  const ext = fileExt(file);
  const path = `join_groups_media/${actorUid}/group_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export function joinGroupImageErrorMessage(err) {
  const code = String(err?.message || err || "").trim();
  if (code === "JOIN_GROUP_IMAGE_TYPE")
    return "صيغة الصورة غير مدعومة (JPG/PNG/WebP/GIF فقط).";
  if (code === "JOIN_GROUP_IMAGE_TOO_LARGE")
    return "حجم الصورة كبير (الحد الأقصى 3MB).";
  return "تعذّر رفع الصورة.";
}
