import { AnyColumn } from "drizzle-orm";

/**
 * Helper to create column definitions with automatic snake_case to camelCase mapping
 * This solves the systemic issue where database uses snake_case but code expects camelCase
 */

// Convert camelCase to snake_case
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to create aliased columns that map camelCase names to snake_case database columns
export function column<T extends AnyColumn>(
  camelCaseName: string,
  columnDef: T
): T {
  const snakeCaseName = camelToSnake(camelCaseName);
  
  // If the names are different, we need to alias the column
  if (camelCaseName !== snakeCaseName) {
    // Use Drizzle's alias syntax: the database column name is snake_case,
    // but we reference it in code as camelCase
    return columnDef.as(camelCaseName) as T;
  }
  
  return columnDef;
}

/**
 * Example usage:
 * 
 * Instead of:
 *   healthSystemId: integer("health_system_id")
 * 
 * Use:
 *   healthSystemId: column("healthSystemId", integer("health_system_id"))
 * 
 * This will allow code to use `healthSystemId` while the database column is `health_system_id`
 */