import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatDateLabel } from './ConversationVolumeChart';

/**
 * Feature: admin-dashboard-nivo-charts, Property 1: Date Formatting Consistency
 * For any valid ISO date string (YYYY-MM-DD format), the date formatting function
 * SHALL produce a string in "Mon D" format (e.g., "Jan 9", "Dec 25").
 * Validates: Requirements 2.3
 */
describe('formatDateLabel - Property-Based Tests', () => {
  it('Property 1: Date Formatting Consistency - produces valid "Mon D" format for all valid ISO dates', () => {
    // Generate valid ISO date strings (YYYY-MM-DD) by generating year, month, day separately
    const isoDateArbitrary = fc.tuple(
      fc.integer({ min: 1970, max: 2099 }), // year
      fc.integer({ min: 1, max: 12 }),       // month
      fc.integer({ min: 1, max: 28 })        // day (use 28 to avoid invalid dates like Feb 30)
    ).map(([year, month, day]) => {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });

    fc.assert(
      fc.property(isoDateArbitrary, (isoDate) => {
        const result = formatDateLabel(isoDate);
        
        // Valid month abbreviations
        const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Pattern: "Mon D" or "Mon DD" (e.g., "Jan 9" or "Jan 25")
        const monDPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/;
        
        // Result should match the "Mon D" pattern
        expect(result).toMatch(monDPattern);
        
        // Extract month and day from result
        const [month, day] = result.split(' ');
        
        // Month should be a valid abbreviation
        expect(validMonths).toContain(month);
        
        // Day should be between 1 and 31
        const dayNum = parseInt(day, 10);
        expect(dayNum).toBeGreaterThanOrEqual(1);
        expect(dayNum).toBeLessThanOrEqual(31);
      }),
      { numRuns: 100 }
    );
  });
});
