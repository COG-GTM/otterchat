"use client";

import { ChevronDownIcon, ImageIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  IMAGE_MODELS,
  TEXT_MODELS,
  resolveImageModel,
  resolveTextModel,
  type ImageModel,
  type TextModel,
} from "@/lib/models";

export function TextModelPicker({
  disabled = false,
  onChange,
  value,
}: {
  readonly disabled?: boolean;
  readonly onChange: (id: string) => void;
  readonly value: string;
}) {
  const model = resolveTextModel(value);

  return (
    <ModelPill
      disabled={disabled}
      icon={SparklesIcon}
      label={model.label}
      models={TEXT_MODELS}
      onChange={onChange}
      tooltip={`Text model: ${model.label}`}
      value={model.id}
    />
  );
}

export function ImageModelPicker({
  disabled = false,
  onChange,
  value,
}: {
  readonly disabled?: boolean;
  readonly onChange: (id: string) => void;
  readonly value: string;
}) {
  const model = resolveImageModel(value);

  return (
    <ModelPill
      disabled={disabled}
      icon={ImageIcon}
      label={model.label}
      models={IMAGE_MODELS}
      onChange={onChange}
      tooltip={`Image model: ${model.label}`}
      value={model.id}
    />
  );
}

function ModelPill({
  disabled,
  icon: Icon,
  label,
  models,
  onChange,
  tooltip,
  value,
}: {
  readonly disabled: boolean;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly models: readonly (ImageModel | TextModel)[];
  readonly onChange: (id: string) => void;
  readonly tooltip: string;
  readonly value: string;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            className="inline-flex h-8 min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            type="button"
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3.5 shrink-0" />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-64" side="top">
        <DropdownMenuRadioGroup onValueChange={onChange} value={value}>
          {models.map((model) => (
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
