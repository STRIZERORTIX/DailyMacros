import { CalendarIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseDate, toDateStr } from "@/lib/date";

function compactDate(s: string) {
  return parseDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function DatePicker({
  value,
  onChange,
  max,
  min,
  id,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  id?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const maxDate = max ? parseDate(max) : undefined;
  const minDate = min ? parseDate(min) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button id={id} type="button" variant="outline" className="w-full justify-start font-normal">
            <CalendarIcon />
            {compactDate(value)}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(toDateStr(d));
            setOpen(false);
          }}
          disabled={(d) => {
            if (maxDate && d > maxDate) return true;
            if (minDate && d < minDate) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
