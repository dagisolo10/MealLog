import { monthNames, toEC } from "kenat";

export const getDay = (date: string) => toEC(new Date(date).getFullYear(), new Date(date).getMonth() + 1, new Date(date).getDate()).day;
export const getMonth = (date: string) => toEC(new Date(date).getFullYear(), new Date(date).getMonth() + 1, new Date(date).getDate()).month;
export const getYear = (date: string) => toEC(new Date(date).getFullYear(), new Date(date).getMonth() + 1, new Date(date).getDate()).year;
export const getFullDate = (date: string) => `${monthNames.amharic[getMonth(date) - 1]} ${getDay(date)}, ${getYear(date)}`;

export const getEthDayOnly = (dateStr: string) => {
    const d = new Date(dateStr);
    return toEC(d.getFullYear(), d.getMonth() + 1, d.getDate()).day;
};
