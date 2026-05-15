import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deepEqual(a: any, b: any, depth = 0): boolean {
  if (a === b) return true;
  if (depth > 10) return true; // Safety break for very deep objects
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  
  // Handle Firestore Timestamps or similar objects with seconds/nanoseconds
  if (a.seconds !== undefined && a.nanoseconds !== undefined && b.seconds !== undefined && b.nanoseconds !== undefined) {
    return a.seconds === b.seconds && a.nanoseconds === b.nanoseconds;
  }

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key], depth + 1)) return false;
  }
  
  return true;
}

export function safeStringify(obj: any): string {
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';
  
  const cache = new WeakSet();
  try {
    const result = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return "[Circular]";
        }
        cache.add(value);

        // Robust check for Socket objects and other circular-prone structures
        try {
          if (
            value.io || 
            value.nsp || 
            value._callbacks ||
            value.connected !== undefined || 
            (value.constructor && (
              value.constructor.name === 'Socket' || 
              value.constructor.name === 'Socket2' || 
              value.constructor.name === 'Manager' ||
              value.constructor.name === 'EventEmitter'
            ))
          ) {
            return '[Socket]';
          }
        } catch (e) {
          // If property access fails (e.g. cross-origin), skip this object
          return '[Unsafe Object]';
        }
      }
      return value;
    });
    return result || String(obj);
  } catch (err) {
    console.error('safeStringify failed:', err);
    return '[Unstringifiable Object]';
  }
}

export const getTimeFrameInMs = (tf: string): number => {
  const numMatches = tf.match(/\d+/);
  const letterMatches = tf.match(/[a-zA-Z]+/);
  if (!numMatches || !letterMatches) return 60000;
  const value = parseInt(numMatches[0]);
  const unit = letterMatches[0].toUpperCase();
  
  switch (unit) {
    case 'S': return value * 1000;
    case 'M': return value * 60 * 1000;
    case 'H': return value * 60 * 60 * 1000;
    case 'D': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
};
