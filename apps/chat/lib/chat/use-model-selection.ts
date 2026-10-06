"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_IMAGE_MODEL_ID,
  DEFAULT_TEXT_MODEL_ID,
  resolveImageModel,
  resolveTextModel,
} from "@/lib/models";

const IMAGE_MODEL_STORAGE_KEY = "otterchat-image-model";
const TEXT_MODEL_STORAGE_KEY = "otterchat-text-model";

export function useModelSelection() {
  const [imageModelId, setImageModelIdState] = useState(DEFAULT_IMAGE_MODEL_ID);
  const [textModelId, setTextModelIdState] = useState(DEFAULT_TEXT_MODEL_ID);

  useEffect(() => {
    setImageModelIdState(
      resolveImageModel(window.localStorage.getItem(IMAGE_MODEL_STORAGE_KEY)).id,
    );
    setTextModelIdState(resolveTextModel(window.localStorage.getItem(TEXT_MODEL_STORAGE_KEY)).id);
  }, []);

  const setImageModelId = useCallback((id: string) => {
    const resolved = resolveImageModel(id).id;

    window.localStorage.setItem(IMAGE_MODEL_STORAGE_KEY, resolved);
    setImageModelIdState(resolved);
  }, []);

  const setTextModelId = useCallback((id: string) => {
    const resolved = resolveTextModel(id).id;

    window.localStorage.setItem(TEXT_MODEL_STORAGE_KEY, resolved);
    setTextModelIdState(resolved);
  }, []);

  return { imageModelId, setImageModelId, setTextModelId, textModelId };
}
