import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CarbInfo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label="About total and net carbohydrates"
        >
          <CircleHelp />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal text-left">
        <p>
          <strong>Total carbs</strong> include sugars, starches and fibre. In this app, <strong>net carbs</strong> are
          estimated as recorded total carbs minus fibre. Sugar alcohols are not subtracted.
        </p>
        <p className="mt-2">
          Total carbs show the full amount you eat. Some people track net carbs for low-carb plans or blood-glucose
          management. Food labels and databases can use different carb conventions, so this is an estimate. Follow your
          clinician&apos;s advice if you track carbs for a health condition.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
