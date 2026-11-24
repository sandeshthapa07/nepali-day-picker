// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DayPicker as StockDayPicker } from "react-day-picker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bsToAd, getBsMonthLength, getBsWeekOfMonth } from "../src";
import { type CalendarVariant, DayPicker, useNepaliCalendar } from "../src/react";
import { ymd } from "./helpers";

afterEach(cleanup);

const BAISAKH_2082 = bsToAd(2082, 1, 1); // a Monday
// Dual captions put the other calendar's months on a second line; join them back for comparison.
const caption = () => {
  const label = document.querySelector(".rdp-caption_label");
  const second = label?.querySelector("[data-secondary-caption]");
  return second ? `${label?.firstElementChild?.textContent} · ${second.textContent}` : label?.textContent;
};
// react-day-picker hides the weekday row from screen readers, so read the header cells directly.
const weekdayHeaders = () => [...document.querySelectorAll("th.rdp-weekday")].map((th) => th.textContent);
const weeks = () => [...document.querySelectorAll("tbody tr")];
const dayButtons = () => within(screen.getByRole("grid")).getAllByRole("button");
const dayButton = (text: string) =>
  dayButtons().find((b) => b.firstChild?.textContent === text || b.textContent === text) as HTMLElement;

describe("the four variants", () => {
  it.each<[CalendarVariant, "ne" | "en", string, string[], string, string]>([
    ["bs", "ne", "बैशाख २०८२", ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"], "१२", "१२"],
    ["bs", "en", "Baisakh 2082", ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], "12", "12"],
    ["bs-ad", "ne", "बैशाख २०८२ · अप्रिल–मे २०२५", ["आइत"], "१२", "१२२५"],
    ["bs-ad", "en", "Baisakh 2082 · Apr–May 2025", ["Sun"], "12", "1225"],
  ])("%s / %s", (variant, lang, title, weekdays, day12, day12Text) => {
    render(<DayPicker variant={variant} lang={lang} mode="single" month={BAISAKH_2082} />);
    expect(caption()).toBe(title);
    expect(weekdayHeaders().slice(0, weekdays.length)).toEqual(weekdays);
    expect(dayButtons()).toHaveLength(31);
    expect(dayButton(day12).textContent).toBe(day12Text);
  });

  it.each<[CalendarVariant, "ne" | "en", string, string]>([
    ["ad-bs", "en", "April 2025 · Chaitra 2081–Baisakh 2082", "2512"],
    ["ad-bs", "ne", "अप्रिल २०२५ · चैत २०८१–बैशाख २०८२", "२५१२"],
    ["ad", "ne", "अप्रिल २०२५", "२५"],
    ["ad", "en", "April 2025", "25"],
  ])("%s / %s", (variant, lang, title, day25Text) => {
    render(<DayPicker variant={variant} lang={lang} mode="single" month={new Date(2025, 3, 1)} />);
    expect(caption()).toBe(title);
    expect(dayButtons()).toHaveLength(30);
    expect(dayButton(lang === "ne" ? "२५" : "25").textContent).toBe(day25Text);
  });

  it("dual captions keep the full text for screen readers", () => {
    render(<DayPicker variant="bs-ad" lang="en" month={BAISAKH_2082} />);
    expect(screen.getByRole("grid").getAttribute("aria-label")).toBe("Baisakh 2082 · Apr–May 2025");
    expect(document.querySelector("[data-secondary-caption]")?.textContent).toBe("Apr–May 2025");
  });

  it("defaults to a Nepali BS calendar", () => {
    render(<DayPicker month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख २०८२");
  });

  it("secondaryLang and digits change only their part", () => {
    render(<DayPicker variant="bs-ad" lang="ne" secondaryLang="en" mode="single" month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख २०८२ · Apr–May 2025");
    expect(dayButton("१२").textContent).toBe("१२25");
    cleanup();
    render(<DayPicker lang="ne" digits="en" month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख 2082");
  });

  it("weekdayFormat, captionFormat and monthNames", () => {
    render(
      <DayPicker
        lang="ne"
        weekdayFormat="dd"
        captionFormat="YYYY [साल] MMMM"
        monthNames="formal"
        month={BAISAKH_2082}
      />,
    );
    expect(weekdayHeaders()[0]).toBe("आ");
    expect(caption()).toBe("२०८२ साल वैशाख");
  });
});

describe("the BS grid", () => {
  it("starts Baisakh 2082 on Monday", () => {
    render(<DayPicker lang="en" month={BAISAKH_2082} />);
    const cells = within(weeks()[0] as HTMLElement).getAllByRole("gridcell");
    expect(cells[0].textContent).toBe("");
    expect(cells[1].textContent).toBe("1");
  });

  it("shows a 32-day month and a six-row month", () => {
    let month = 1;
    while (getBsMonthLength(2082, month) !== 32) month++;
    render(<DayPicker lang="en" mode="single" month={bsToAd(2082, month, 1)} />);
    expect(dayButtons()).toHaveLength(32);
    cleanup();

    let six: Date | undefined;
    for (let y = 2080; y <= 2085 && !six; y++) {
      for (let m = 1; m <= 12 && !six; m++) {
        if (getBsWeekOfMonth(bsToAd(y, m, getBsMonthLength(y, m))) === 6) six = bsToAd(y, m, 1);
      }
    }
    render(<DayPicker lang="en" month={six} />);
    expect(weeks()).toHaveLength(6);
  });

  it("marks Saturdays and today", () => {
    render(<DayPicker lang="en" mode="single" month={BAISAKH_2082} today={bsToAd(2082, 1, 12)} />);
    const saturday = dayButton("6").closest("td");
    expect(saturday?.className).toContain("ndp-saturday");
    expect(dayButton("12").closest("td")?.getAttribute("data-today")).toBe("true");
    expect(dayButton("12").getAttribute("aria-label")).toBe("Today, Friday, 12 Baisakh 2082");
  });

  it("labels days in both calendars in dual variants", () => {
    render(<DayPicker variant="bs-ad" lang="en" mode="single" month={BAISAKH_2082} />);
    expect(dayButton("12").getAttribute("aria-label")).toBe("Friday, 12 Baisakh 2082 (Friday, 25 April 2025)");
    cleanup();
    render(<DayPicker variant="bs-ad" lang="en" month={BAISAKH_2082} />); // no mode: plain grid cells
    const cell = document.querySelector('td[data-day="2082-01-12"]');
    expect(cell?.getAttribute("aria-label")).toBe("Friday, 12 Baisakh 2082 (Friday, 25 April 2025)");
  });
});

describe("selection returns plain Dates", () => {
  it("single", async () => {
    const onSelect = vi.fn();
    render(<DayPicker lang="en" mode="single" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("12"));
    const selected = onSelect.mock.calls[0][0] as Date;
    expect(selected).toBeInstanceOf(Date);
    expect(ymd(selected)).toBe("2025-04-25");
    expect(selected.getHours()).toBe(0);
  });

  it("range", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<DayPicker lang="en" mode="range" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("5"));
    const first = onSelect.mock.calls.at(-1)?.[0];
    rerender(<DayPicker lang="en" mode="range" selected={first} onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("10"));
    const range = onSelect.mock.calls.at(-1)?.[0] ?? {};
    expect([ymd(range.from), ymd(range.to)]).toEqual([ymd(bsToAd(2082, 1, 5)), ymd(bsToAd(2082, 1, 10))]);
  });

  it("multiple", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<DayPicker lang="en" mode="multiple" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("1"));
    rerender(
      <DayPicker
        lang="en"
        mode="multiple"
        selected={onSelect.mock.calls[0][0]}
        onSelect={onSelect}
        month={BAISAKH_2082}
      />,
    );
    await userEvent.click(dayButton("31"));
    const dates = (onSelect.mock.calls.at(-1)?.[0] ?? []) as Date[];
    expect(dates.map(ymd)).toEqual([ymd(bsToAd(2082, 1, 1)), ymd(bsToAd(2082, 1, 31))]);
  });

  it("disabled days cannot be picked", () => {
    render(<DayPicker lang="en" mode="single" disabled={{ before: bsToAd(2082, 1, 10) }} month={BAISAKH_2082} />);
    expect((dayButton("9") as HTMLButtonElement).disabled).toBe(true);
    expect((dayButton("10") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("navigation", () => {
  it("the next button moves one BS month", async () => {
    render(<DayPicker lang="ne" defaultMonth={BAISAKH_2082} />);
    await userEvent.click(screen.getByRole("button", { name: "अर्को महिना" }));
    expect(caption()).toBe("जेठ २०८२");
  });

  it("the arrow keys cross a BS month boundary", async () => {
    render(<DayPicker lang="en" mode="single" defaultMonth={BAISAKH_2082} />);
    await userEvent.click(dayButton("31"));
    await userEvent.keyboard("{ArrowRight}");
    expect(caption()).toBe("Jestha 2082");
    expect(document.activeElement?.textContent).toBe("1");
  });

  it("month and year dropdowns list BS months and years", async () => {
    render(<DayPicker lang="ne" mode="single" captionLayout="dropdown" defaultMonth={BAISAKH_2082} />);
    const [months, years] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect([...months.options].map((o) => o.textContent)).toEqual([
      "बैशाख",
      "जेठ",
      "असार",
      "साउन",
      "भदौ",
      "असोज",
      "कार्तिक",
      "मंसिर",
      "पुस",
      "माघ",
      "फागुन",
      "चैत",
    ]);
    expect(years.options[0].textContent).toBe("१९७०");
    expect(years.options[years.options.length - 1].textContent).toBe("२१००");
    await userEvent.selectOptions(years, "2083");
    await userEvent.selectOptions(months, "7");
    expect(dayButtons()).toHaveLength(getBsMonthLength(2083, 8));
    expect(document.querySelector("td[data-day]:not([data-hidden])")?.getAttribute("data-day")).toBe("2083-08-01");
  });

  it("stays inside the data table", () => {
    render(<DayPicker lang="en" defaultMonth={bsToAd(1970, 1, 1)} />);
    expect(screen.getByRole("button", { name: "Go to the Previous Month" }).getAttribute("aria-disabled")).toBe("true");
    cleanup();
    render(<DayPicker lang="en" showOutsideDays defaultMonth={bsToAd(2100, 12, 1)} />);
    expect(caption()).toBe("Chaitra 2100");
    expect(screen.getByRole("button", { name: "Go to the Next Month" }).getAttribute("aria-disabled")).toBe("true");
  });
});

function Stock() {
  const nepali = useNepaliCalendar({ variant: "bs-ad", lang: "en" });
  return <StockDayPicker mode="single" month={BAISAKH_2082} {...nepali} />;
}

describe("useNepaliCalendar", () => {
  it("turns react-day-picker's own DayPicker into a BS calendar", () => {
    render(<Stock />);
    expect(caption()).toBe("Baisakh 2082 · Apr–May 2025");
    expect(dayButton("12").textContent).toBe("1225");
  });
});
