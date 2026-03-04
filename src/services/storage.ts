import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@config/firebase";

export function diaryImagePath(
  householdId: string,
  entryId: string,
  filename: string
): string {
  return `households/${householdId}/diary/${entryId}/${filename}`;
}

export async function uploadImage(
  localUri: string,
  storagePath: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function deleteImage(downloadUrl: string): Promise<void> {
  const storageRef = ref(storage, downloadUrl);
  await deleteObject(storageRef);
}
