"use client";

import { ChevronDownIcon, ImageIcon, SparklesIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IMAGE_MODELS, TEXT_MODELS, resolveImageModel, resolveTextModel } from "@/lib/models";

export function ModelPicker({
  disabled = false,
  imageModelId,
  onImageModelChange,
  onTextModelChange,
  textModelId,
}: {
  readonly disabled?: boolean;
  readonly imageModelId: string;
  readonly onImageModelChange: (id: string) => void;
  readonly onTextModelChange: (id: string) => void;
  readonly textModelId: string;
}) {
  const textModel = resolveTextModel(textModelId);
  const imageModel = resolveImageModel(imageModelId);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            className="inline-flex h-8 min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            type="button"
          >
            <SparklesIcon className="size-3.5 shrink-0" />
            <span className="truncate">{textModel.label}</span>
            <ChevronDownIcon className="size-3.5 shrink-0" />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          Text: {textModel.label} · Image: {imageModel.label}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-64" side="top">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SparklesIcon className="size-3.5" />
          Text model
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={onTextModelChange} value={textModel.id}>
          {TEXT_MODELS.map((model) => (
            <DropdownMenuRadioItem key={model.id} value={model.id}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{model.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {model.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" />
          Image model
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={onImageModelChange} value={imageModel.id}>
          {IMAGE_MODELS.map((model) => (
            <DropdownMenuRadioItem key={model.id} value={model.id}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{model.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {model.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
