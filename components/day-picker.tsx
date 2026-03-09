"use client";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker/ethiopic";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toEC, monthNames } from "kenat";
import "react-day-picker/style.css";
import { useState } from "react";

interface Props {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
}

export function EthiopianDatePicker({ date, setDate }: Props) {
    const [open, setOpen] = useState(false);

    const getButtonLabel = () => {
        if (!date) return <span>Pick a start date</span>;

        const ec = toEC(date.getFullYear(), date.getMonth() + 1, date.getDate());

        console.log(`${monthNames.amharic[ec.month - 1]} ${ec.day}, ${ec.year}`);
        console.log(ec.day, ec.month, ec.year);
        return `${monthNames.amharic[ec.month - 1]} ${ec.day}, ${ec.year}`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger onClick={() => setOpen(true)} asChild>
                <Button type="button" variant={"outline"} className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}>
                    <CalendarIcon className="size-4" />
                    {getButtonLabel()}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
                <DayPicker
                    numerals="latn"
                    formatters={{
                        formatDay: (d) => {
                            const eth = toEC(d.getFullYear(), d.getMonth() + 1, d.getDate());
                            return eth.day.toString();
                        },
                    }}
                    mode="single"
                    selected={date}
                    onSelect={(value) => {
                        setDate(value);
                        setOpen(false);
                    }}
                    showOutsideDays
                    className="p-3"
                />
            </PopoverContent>
        </Popover>
    );
}
