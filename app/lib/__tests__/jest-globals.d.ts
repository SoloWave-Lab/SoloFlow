// Type declarations for Jest globals when Jest is not installed
declare module '@jest/globals' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function beforeEach(fn: () => void): void;
  export const expect: any;
}