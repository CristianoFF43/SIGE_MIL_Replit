import { db } from "./db";
import { customFieldDefinitions } from "@shared/schema";
import { inArray, sql } from "drizzle-orm";

export async function cleanupTempCustomField() {
    try {
        console.log("🧹 Running cleanup for duplicate standard fields (TEMP, SEÇ/FRAÇÃO)...");

        const tempKeys = ['TEMP', 'Temp', 'temp', 'TEMP.', 'Temp.', 'temp.'];
        const secaoKeys = [
            'SEÇ/FRAÇÃO',
            'SEÇÃO/FRAÇÃO',
            'SECAO/FRAÇÃO',
            'SEÇ/FRACAO',
            'SECAO/FRACAO',
            'SEC/FRAÇÃO',
            'SEC/FRACAO',
            'SEC FRACAO',
            'SECAO FRACAO',
        ];

        // Migrate shadowed custom fields into standard columns if empty
        const secaoCoalesce = sql`COALESCE(NULLIF(secao_fracao, ''), ${sql.join(secaoKeys.map((k) => sql`custom_fields->>${k}`), sql`, `)})`;
        const secaoAnyKey = sql.join(secaoKeys.map((k) => sql`custom_fields ? ${k}`), sql` OR `);
        await db.execute(sql`
          UPDATE military_personnel
          SET secao_fracao = ${secaoCoalesce}
          WHERE (secao_fracao IS NULL OR secao_fracao = '')
            AND (${secaoAnyKey});
        `);

        const tempCoalesce = sql`COALESCE(NULLIF(temp, ''), ${sql.join(tempKeys.map((k) => sql`custom_fields->>${k}`), sql`, `)})`;
        const tempAnyKey = sql.join(tempKeys.map((k) => sql`custom_fields ? ${k}`), sql` OR `);
        await db.execute(sql`
          UPDATE military_personnel
          SET temp = ${tempCoalesce}
          WHERE (temp IS NULL OR temp = '')
            AND (${tempAnyKey});
        `);

        // Normalize temp values to SIM/NÃO for consistent filters
        await db.execute(sql`
          UPDATE military_personnel
          SET temp = CASE
            WHEN temp ILIKE 'sim' THEN 'SIM'
            WHEN temp ILIKE 'nao' OR temp ILIKE 'não' THEN 'NÃO'
            ELSE temp
          END
          WHERE temp IS NOT NULL AND temp <> '';
        `);

        // Remove shadowed keys from custom_fields JSONB
        let secaoRemoveExpr = sql`custom_fields`;
        for (const key of secaoKeys) {
            secaoRemoveExpr = sql`${secaoRemoveExpr} - ${key}`;
        }
        await db.execute(sql`
          UPDATE military_personnel
          SET custom_fields = ${secaoRemoveExpr}
          WHERE ${secaoAnyKey};
        `);

        let tempRemoveExpr = sql`custom_fields`;
        for (const key of tempKeys) {
            tempRemoveExpr = sql`${tempRemoveExpr} - ${key}`;
        }
        await db.execute(sql`
          UPDATE military_personnel
          SET custom_fields = ${tempRemoveExpr}
          WHERE ${tempAnyKey};
        `);

        // Delete custom field definitions shadowing standard columns
        const shadowedFieldNames = [...tempKeys, ...secaoKeys];
        const result = await db.delete(customFieldDefinitions)
            .where(inArray(customFieldDefinitions.name, shadowedFieldNames))
            .returning();

        if (result.length > 0) {
            console.log(`✅ Removed ${result.length} shadowed custom field definition(s).`);
        } else {
            console.log("ℹ️ No shadowed custom field definitions found.");
        }
    } catch (error) {
        console.error("❌ Error cleaning up standard fields:", error);
    }
}
