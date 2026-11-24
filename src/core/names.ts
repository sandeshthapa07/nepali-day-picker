type Twelve = readonly [string, string, string, string, string, string, string, string, string, string, string, string];
type Seven = readonly [string, string, string, string, string, string, string];

/**
 * BS month names, Baisakh first.
 * `ne.long` is the everyday spelling and `ne.formal` the formal one. Nepali has no standard short
 * form, so `ne.short` repeats `ne.long`.
 */
export const BS_MONTHS = Object.freeze({
  ne: Object.freeze({
    long: ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"] as Twelve,
    formal: [
      "वैशाख",
      "ज्येष्ठ",
      "आषाढ",
      "श्रावण",
      "भाद्र",
      "आश्विन",
      "कार्तिक",
      "मार्गशीर्ष",
      "पौष",
      "माघ",
      "फाल्गुन",
      "चैत्र",
    ] as Twelve,
    short: ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"] as Twelve,
  }),
  en: Object.freeze({
    long: [
      "Baisakh",
      "Jestha",
      "Asar",
      "Shrawan",
      "Bhadra",
      "Ashwin",
      "Kartik",
      "Mangsir",
      "Poush",
      "Magh",
      "Falgun",
      "Chaitra",
    ] as Twelve,
    short: ["Bai", "Jes", "Asa", "Shr", "Bha", "Ash", "Kar", "Man", "Pou", "Mag", "Fal", "Cha"] as Twelve,
  }),
});

/** Gregorian month names, January first. Nepali has no standard short form, so `ne.short` repeats `ne.long`. */
export const AD_MONTHS = Object.freeze({
  ne: Object.freeze({
    long: [
      "जनवरी",
      "फेब्रुअरी",
      "मार्च",
      "अप्रिल",
      "मे",
      "जुन",
      "जुलाई",
      "अगस्ट",
      "सेप्टेम्बर",
      "अक्टोबर",
      "नोभेम्बर",
      "डिसेम्बर",
    ] as Twelve,
    short: [
      "जनवरी",
      "फेब्रुअरी",
      "मार्च",
      "अप्रिल",
      "मे",
      "जुन",
      "जुलाई",
      "अगस्ट",
      "सेप्टेम्बर",
      "अक्टोबर",
      "नोभेम्बर",
      "डिसेम्बर",
    ] as Twelve,
  }),
  en: Object.freeze({
    long: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ] as Twelve,
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as Twelve,
  }),
});

/** Weekday names, Sunday first. Both calendars share them. `narrow` is for grid headers. */
export const WEEKDAYS = Object.freeze({
  ne: Object.freeze({
    long: ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"] as Seven,
    short: ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"] as Seven,
    narrow: ["आ", "सो", "मं", "बु", "बि", "शु", "श"] as Seven,
  }),
  en: Object.freeze({
    long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as Seven,
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as Seven,
    narrow: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as Seven,
  }),
});

/** Other spellings that parsing accepts, by month (1-12). The tables above are always accepted too. */
export const BS_MONTH_ALIASES: Readonly<Record<number, readonly string[]>> = {
  1: ["Baishakh", "Baishak", "Baisak", "Vaisakh", "Vaishakh", "Vaisakha", "बैसाख"],
  2: ["Jeth", "Jyestha", "Jyeshtha", "Jeshtha", "जेष्ठ"],
  3: ["Ashar", "Asadh", "Ashadh", "Asaar", "Aasadh", "असाढ", "अषाढ"],
  4: ["Shravan", "Srawan", "Saun", "Sawan", "Sharawan"],
  5: ["Bhadau", "Bhadra"],
  6: ["Aswin", "Ashvin", "Asoj", "Ashoj", "असौज"],
  7: ["Kattik", "Karthik", "कात्तिक"],
  8: ["Mangshir", "Mansir", "Marga", "Margashirsha", "मङ्सिर", "मार्ग"],
  9: ["Paush", "Push", "Pus", "Pausha", "पुष"],
  10: ["Maagh"],
  11: ["Phalgun", "Fagun", "Phagun", "Falgoon"],
  12: ["Chait", "Chaitr"],
};

/** Other spellings of Gregorian months that parsing accepts, by month (1-12). */
export const AD_MONTH_ALIASES: Readonly<Record<number, readonly string[]>> = {
  2: ["फेब्रुवरी"],
  8: ["अगस्त"],
  9: ["Sept", "सेप्तेम्बर"],
  10: ["अक्टुबर"],
  11: ["नोवेम्बर"],
};
