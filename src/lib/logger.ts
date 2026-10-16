/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Structured logger that only emits in development builds.
 * Replaces raw console.warn / console.error calls throughout the codebase.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(`[PRB] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    if (isDev) console.error(`[PRB] ${message}`, ...args);
  },
  info(message: string, ...args: unknown[]): void {
    if (isDev) console.info(`[PRB] ${message}`, ...args);
  },
};
