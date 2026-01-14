/**
 * Assert that a value is defined (not null or undefined).
 */
export declare function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T;
/**
 * Assert that a string matches a pattern.
 */
export declare function assertMatches(value: string, pattern: RegExp, message?: string): void;
/**
 * Sleep for a specified number of milliseconds.
 */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=testUtils.d.ts.map