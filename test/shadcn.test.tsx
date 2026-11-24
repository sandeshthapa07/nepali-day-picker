// @vitest-environment jsdom
// shadcn/ui's real calendar.tsx, after the documented one-import swap, renders a BS calendar.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bsToAd } from "../src";
import { useNepaliCalendar } from "../src/react";
import { Calendar } from "./fixtures/shadcn-calendar";
import { CalendarDayButton, Calendar as OriginalCalendar } from "./fixtures/shadcn-calendar-original";
import { ymd } from "./helpers";

afterEach(cleanup);

const BAISAKH_2082 = bsToAd(2082, 1, 1);
// Dual captions put the other calendar's months on a second line; join them back for comparison.
const caption = () => {
  const label = document.querySelector(".rdp-caption_label");
  const second = label?.querySelector("[data-secondary-caption]");
  return second ? `${label?.firstElementChild?.textContent} · ${second.textContent}` : label?.textContent;
};
const dayButton = (main: string) =>
  within(screen.getByRole("grid"))
    .getAllByRole("button")
    .find((b) => b.firstChild?.textContent === main) as HTMLElement;

describe("shadcn Calendar with the one-import swap", () => {
  it("shows a BS month with shadcn's styling", () => {
    render(<Calendar mode="single" month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख २०८२");
    expect(document.querySelector('[data-slot="calendar"]')).not.toBeNull();
    expect(dayButton("१२").className).toContain("[&>span]:text-xs");
  });

  it("bs-ad puts the AD day in the span shadcn's CalendarDayButton styles", () => {
    render(<Calendar mode="single" variant="bs-ad" lang="ne" month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख २०८२ · अप्रिल–मे २०२५");
    const button = dayButton("१२");
    expect(button.querySelector("span[data-secondary-date]")?.textContent).toBe("२५");
    // shadcn's own button, wrapped, not react-day-picker's default
    expect(button.className).toContain("data-[selected-single=true]:bg-primary");
  });

  it("selects a plain Date", async () => {
    const onSelect = vi.fn();
    render(<Calendar mode="single" lang="en" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("12"));
    expect(ymd(onSelect.mock.calls[0][0])).toBe("2025-04-25");
  });

  it("month dropdown lists BS months once the AD formatter line is deleted", () => {
    render(<Calendar mode="single" lang="en" captionLayout="dropdown" defaultMonth={BAISAKH_2082} />);
    const [months] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(months.options[0].textContent).toBe("Baisakh");
    expect(months.options[11].textContent).toBe("Chaitra");
  });
});

function Unedited() {
  const nepali = useNepaliCalendar({ variant: "bs-ad", lang: "en", DayButton: CalendarDayButton });
  return <OriginalCalendar mode="single" captionLayout="dropdown" defaultMonth={BAISAKH_2082} {...nepali} />;
}

describe("useNepaliCalendar with an unedited shadcn Calendar", () => {
  it("spreads into the component, keeps shadcn's day button, and replaces its AD month names", () => {
    render(<Unedited />);
    const button = dayButton("12");
    expect(button.querySelector("span[data-secondary-date]")?.textContent).toBe("25");
    expect(button.className).toContain("[&>span]:text-xs");
    const [months] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(months.options[0].textContent).toBe("Baisakh");
  });
});
