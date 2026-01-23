import { format, startOfYear, endOfYear, eachDayOfInterval, getWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
};

export const formatDisplayDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMMM yyyy', { locale: ru });
};

export const getYearDays = (year: number): Date[] => {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  return eachDayOfInterval({ start, end });
};

export const getWeekNumber = (date: Date): number => {
  return getWeek(date, { weekStartsOn: 1 });
};

export const getDayOfWeek = (date: Date): number => {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1; // Понедельник = 0
};
