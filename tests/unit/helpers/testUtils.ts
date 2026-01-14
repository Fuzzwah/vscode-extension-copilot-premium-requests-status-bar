import { expect } from 'chai';

/**
 * Assert that a value is defined (not null or undefined).
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  expect(value, message).to.not.be.undefined;
  expect(value, message).to.not.be.null;
}

/**
 * Assert that a string matches a pattern.
 */
export function assertMatches(value: string, pattern: RegExp, message?: string): void {
  expect(value, message).to.match(pattern);
}

/**
 * Sleep for a specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
