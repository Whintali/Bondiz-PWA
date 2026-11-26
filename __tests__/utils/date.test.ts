import { calculateAge, toCalendarDate } from "@/utils/date";

describe("toCalendarDate", () => {
  it("garde le jour choisi, quel que soit le fuseau", () => {
    // Minuit heure locale : en UTC (Paris), c'est encore la veille.
    expect(toCalendarDate(new Date(1999, 3, 12))).toBe("1999-04-12");
    expect(toCalendarDate(new Date(2000, 0, 1, 0, 0))).toBe("2000-01-01");
  });
});

describe("calculateAge", () => {
  it("compte les années révolues", () => {
    const today = new Date();
    const twentyYearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    const tomorrowTwentyYearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate() + 1);
    expect(calculateAge(twentyYearsAgo.getTime())).toBe(20);
    expect(calculateAge(tomorrowTwentyYearsAgo.getTime())).toBe(19);
    expect(calculateAge(undefined)).toBe(0);
  });
});
