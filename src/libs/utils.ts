export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const truncateText = (text:string, maxLength: number = 300): string => {
  if (!text.trim() || text.trim().length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`
}

export const formatDate = (date: Date = new Date()): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}