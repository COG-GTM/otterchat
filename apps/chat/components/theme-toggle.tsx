"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveCurrentTheme, setTheme } from "@/lib/theme";

export function ThemeToggle() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="Toggle theme"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolveCurrentTheme() === "dark" ? "light" : "dark")}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoonIcon className="size-4 dark:hidden" />
          <SunIcon className="hidden size-4 dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Toggle theme</TooltipContent>
    </Tooltip>
  );
}
