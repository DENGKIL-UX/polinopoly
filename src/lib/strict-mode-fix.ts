// @ts-nocheck
// Helper for TypeScript strict mode array literal issues
const _temp: Array<any> = [];
export default function strictModeHelper<T>(): T {
  const fn = (...items: T[]): T[] => items;
  return fn();
}

export function safeArraySpread<T extends object>(...items: T[]): T[] {
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item !== 'object' || item === null) result.push(item);
    else {
      const entries = Object.entries(item);
      const obj: Record<string, unknown> = {};
      for (const [key, value] of entries) {
        (obj as any)[key] = value;
      }
      result.push(obj);
    }
  }
  return result;
}

// Re-export to make it available
export const safeArraySpread = safeArraySpread;