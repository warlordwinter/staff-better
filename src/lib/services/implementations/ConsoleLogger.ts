// Console logger implementation

import { ILogger } from "../interfaces/index";

export class ConsoleLogger implements ILogger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : "");
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(
      `[ERROR] ${message}`,
      error?.stack || "",
      meta ? JSON.stringify(meta, null, 2) : ""
    );
  }

  warn(message: string, meta?: any): void {
    console.warn(
      `[WARN] ${message}`,
      meta ? JSON.stringify(meta, null, 2) : ""
    );
  }

  debug(message: string, meta?: any): void {
    console.debug(
      `[DEBUG] ${message}`,
      meta ? JSON.stringify(meta, null, 2) : ""
    );
  }
}
