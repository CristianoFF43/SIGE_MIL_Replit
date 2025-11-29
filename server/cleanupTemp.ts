import { db } from "./db";
import { customFieldDefinitions } from "@shared/schema";
import { eq, or } from "drizzle-orm";

export async function cleanupTempCustomField() {
    try {
        console.log("🧹 Running cleanup for duplicate TEMP custom field...");

        // Delete custom field definition for 'TEMP' or 'temp'
        // This resolves the issue where the report uses the custom field (empty) instead of the standard column
        const result = await db.delete(customFieldDefinitions)
            .where(or(
                eq(customFieldDefinitions.name, 'TEMP'),
                eq(customFieldDefinitions.name, 'temp')
            ))
            .returning();

        if (result.length > 0) {
            console.log(`✅ Removed ${result.length} duplicate 'TEMP' custom field definition(s).`);
        } else {
            console.log("ℹ️ No duplicate 'TEMP' custom field definitions found.");
        }
    } catch (error) {
        console.error("❌ Error cleaning up TEMP custom field:", error);
    }
}
