/**
 * Shared profile-photo flow (Page 01 system, reused everywhere).
 *
 * Single implementation of Take Photo / Choose from Gallery / Remove
 * Photo / Cancel with permissions, upload, persistence, loading, and
 * error handling. Backed by the Page 01 endpoints through
 * services/profile.api.ts — no second storage system.
 *
 * Screens own the displayed avatar URL (dashboard + auth-user
 * fallback + local override); this hook owns the sheet state and the
 * camera/gallery/upload/remove operations. The screen passes
 * `hasPhoto` and applies `onAvatarChanged` to its local override so
 * the new photo shows immediately (backend stays source of truth).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

import {
  removeProfilePhoto,
  uploadProfilePhoto,
  type PickedPhoto,
} from "../services/profile.api";

/** Backend + client cap for profile photos (mirrors backend 5 MB). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface UseProfilePhotoOptions {
  /** Whether an avatar is currently displayed (controls Remove row). */
  hasPhoto: boolean;
  /** Applied immediately after upload/remove so UI updates at once. */
  onAvatarChanged: (avatarUrl: string | null) => void;
}

export function useProfilePhoto({ hasPhoto, onAvatarChanged }: UseProfilePhotoOptions) {
  const [showSheet, setShowSheet] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep latest callback without re-creating handlers each render.
  const changedRef = useRef(onAvatarChanged);
  useEffect(() => {
    changedRef.current = onAvatarChanged;
  }, [onAvatarChanged]);

  const hasPhotoRef = useRef(hasPhoto);
  useEffect(() => {
    hasPhotoRef.current = hasPhoto;
  }, [hasPhoto]);

  const showPermissionDenied = useCallback(
    (kind: "Camera" | "Photo library") => {
      Alert.alert(
        `${kind} permission needed`,
        `JodTod needs ${kind === "Camera" ? "camera" : "photo library"} access to set your profile picture. You can enable it in Settings.`,
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              void Linking.openSettings().catch(() => undefined);
            },
          },
        ],
      );
    },
    [],
  );

  const toPickedPhoto = useCallback(
    (asset: ImagePicker.ImagePickerAsset): PickedPhoto | null => {
      const mimeType =
        asset.mimeType?.toLowerCase() ??
        (asset.fileName?.toLowerCase().endsWith(".png")
          ? "image/png"
          : asset.fileName?.toLowerCase().endsWith(".webp")
            ? "image/webp"
            : "image/jpeg");

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        Alert.alert(
          "Unsupported image",
          "Please choose a JPEG, PNG, or WebP image.",
        );
        return null;
      }

      if (
        typeof asset.fileSize === "number" &&
        asset.fileSize > MAX_PHOTO_BYTES
      ) {
        Alert.alert(
          "Image too large",
          "Please choose an image under 5 MB.",
        );
        return null;
      }

      const ext =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";
      return {
        uri: asset.uri,
        fileName: asset.fileName ?? `profile-photo.${ext}`,
        mimeType,
      };
    },
    [],
  );

  const uploadPicked = useCallback(
    async (photo: PickedPhoto) => {
      if (mountedRef.current) setUploading(true);
      try {
        const avatarUrl = await uploadProfilePhoto(photo);
        if (!mountedRef.current) return;
        // Show immediately; backend is the source of truth on restart.
        changedRef.current(avatarUrl);
        setShowSheet(false);
      } catch (e) {
        if (!mountedRef.current) return;
        Alert.alert(
          "Upload failed",
          e instanceof Error ? e.message : "Could not upload your photo.",
        );
      } finally {
        if (mountedRef.current) setUploading(false);
      }
    },
    [],
  );

  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        // Covers denied + permanently denied (canAskAgain false -> settings).
        showPermissionDenied("Camera");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) {
        return; // User cancelled — stay on the sheet, no crash.
      }
      const picked = toPickedPhoto(result.assets[0]);
      if (picked) await uploadPicked(picked);
    } catch (e) {
      Alert.alert(
        "Camera unavailable",
        e instanceof Error ? e.message : "Could not open the camera.",
      );
    }
  }, [showPermissionDenied, toPickedPhoto, uploadPicked]);

  const chooseFromGallery = useCallback(async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showPermissionDenied("Photo library");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) {
        return; // User cancelled — stay on the sheet, no crash.
      }
      const picked = toPickedPhoto(result.assets[0]);
      if (picked) await uploadPicked(picked);
    } catch (e) {
      Alert.alert(
        "Gallery unavailable",
        e instanceof Error ? e.message : "Could not open the gallery.",
      );
    }
  }, [showPermissionDenied, toPickedPhoto, uploadPicked]);

  const removePhoto = useCallback(() => {
    Alert.alert(
      "Remove photo?",
      "Your profile picture will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (mountedRef.current) setUploading(true);
              try {
                await removeProfilePhoto();
                if (!mountedRef.current) return;
                changedRef.current(null);
                setShowSheet(false);
              } catch (e) {
                if (!mountedRef.current) return;
                Alert.alert(
                  "Removal failed",
                  e instanceof Error
                    ? e.message
                    : "Could not remove your photo.",
                );
              } finally {
                if (mountedRef.current) setUploading(false);
              }
            })();
          },
        },
      ],
    );
  }, []);

  return {
    showSheet,
    setShowSheet,
    uploading,
    takePhoto,
    chooseFromGallery,
    removePhoto,
  };
}
