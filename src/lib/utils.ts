import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date | undefined | null) {
  if (!date) return '-';
  try {
    // Se for uma string no formato YYYY-MM-DD (comum em inputs de data e retornos do banco),
    // precisamos tratar como data local para evitar problemas de fuso horário (ex: aparecer um dia antes).
    if (typeof date === 'string' && date.includes('-') && !date.includes('T') && date.length <= 10) {
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('pt-BR').format(localDate);
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR').format(d);
  } catch (e) {
    return '-';
  }
}
