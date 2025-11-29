import { google } from 'googleapis';
import { db } from "./db";
import { militaryPersonnel, customFieldDefinitions } from "@shared/schema";
import { validateAndNormalizeCustomFields } from "./storage";

async function getGoogleSheetsClient() {
  // Use Firebase Admin credentials which are already set up for the project
  // This avoids needing separate Google Cloud credentials just for Sheets
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Firebase Service Account credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
      project_id: projectId,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Mapeamento de colunas da planilha (baseado no formato típico)
// A: ORD, B: P/GRAD, C: A/Q/S, D: NOME COMPLETO, E: NOME GUERRA, F: CIA
// G: SEÇ/FRAÇÃO, H: FUNÇÃO, I: DATA/PRAÇA, J: CURSO, K: SITUAÇÃO, L: MISSÃO/OP
// M: CPF, N: IDENTIDADE, O: ENDEREÇO, P: Nº, Q: BAIRRO, R: PONTO REFERÊNCIA
// S: CIDADE, T: TELEFONE 1, U: TELEFONE 2, V: EMAIL, W: OBS

interface RawMilitaryData {
  ord?: number;
  postoGraduacao: string;
  armaQuadroServico?: string;
  nomeCompleto: string;
  nomeGuerra?: string;
  companhia: string;
  secaoFracao?: string;
  funcao?: string;
  dataPraca?: string;
  curso?: string;
  situacao?: string;
  missaoOp?: string;
  cpf?: string;
  identidade?: string;
  endereco?: string;
  numeroResidencia?: string;
  bairro?: string;
  pontoReferencia?: string;
  cidade?: string;
  telefoneContato1?: string;
  telefoneContato2?: string;
  email?: string;
  observacoes?: string;
  customFields?: Record<string, any>; // Custom fields JSONB
}

function parseRow(row: any[], customFieldsHeader: string[] = []): RawMilitaryData | null {
  // Pula linhas vazias ou de cabeçalho
  if (!row || row.length === 0) return null;
  if (!row[1] || !row[3]) return null; // Precisa ter pelo menos P/GRAD e NOME COMPLETO

  // Remove espaços extras e converte para string
  // IMPORTANTE: Retorna undefined se célula vazia, null, ou contém apenas espaços
  const cleanStr = (val: any) => {
    if (val === null || val === undefined || val === '') return undefined;
    const cleaned = String(val).trim();
    // Se após limpar ficou vazio, retorna undefined
    return cleaned === '' ? undefined : cleaned;
  };

  const cleanNum = (val: any) => {
    if (!val) return undefined;
    const num = parseInt(String(val).trim());
    return isNaN(num) ? undefined : num;
  };

  // Process custom fields (columns after index 22, which is column W/OBS)
  const customFields: Record<string, any> = {};
  for (let i = 0; i < customFieldsHeader.length; i++) {
    const fieldName = customFieldsHeader[i];
    const value = cleanStr(row[23 + i]); // Start at column X (index 23)
    if (value !== undefined && fieldName) {
      customFields[fieldName] = value;
    }
  }

  return {
    ord: cleanNum(row[0]), // ORD pode ser vazio para Cabos
    postoGraduacao: cleanStr(row[1]) || '', // P/GRAD (obrigatório)
    armaQuadroServico: cleanStr(row[2]), // A/Q/S
    nomeCompleto: cleanStr(row[3]) || '', // NOME COMPLETO (obrigatório)
    nomeGuerra: cleanStr(row[4]), // NOME GUERRA
    companhia: cleanStr(row[5]) || '', // CIA (obrigatório)
    secaoFracao: cleanStr(row[6]), // SEÇ/FRAÇÃO
    funcao: cleanStr(row[7]), // FUNÇÃO
    dataPraca: cleanStr(row[8]), // DATA/PRAÇA
    curso: cleanStr(row[9]), // CURSO
    situacao: cleanStr(row[10]), // SITUAÇÃO
    missaoOp: cleanStr(row[11]), // MISSÃO/OP
    cpf: cleanStr(row[12]), // CPF
    identidade: cleanStr(row[13]), // IDENTIDADE
    endereco: cleanStr(row[14]), // ENDEREÇO
    numeroResidencia: cleanStr(row[15]), // Nº
    bairro: cleanStr(row[16]), // BAIRRO
    pontoReferencia: cleanStr(row[17]), // PONTO REFERÊNCIA
    cidade: cleanStr(row[18]), // CIDADE
    telefoneContato1: cleanStr(row[19]), // TELEFONE 1
    telefoneContato2: cleanStr(row[20]), // TELEFONE 2
    email: cleanStr(row[21]), // EMAIL
    observacoes: cleanStr(row[22]), // OBS
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
  };
}

export async function importFromGoogleSheets(spreadsheetId: string, sheetName: string = 'Sheet1') {
  try {
    console.log(`Starting import from Google Sheets: ${spreadsheetId}`);

    const sheets = await getGoogleSheetsClient();

    // Busca todos os dados da planilha (estende até coluna ZZ para pegar campos customizáveis)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`, // Todas as colunas A até ZZ
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in spreadsheet');
    }

    console.log(`Found ${rows.length} rows in spreadsheet`);

    // Extract custom field headers from first row (columns after W/index 22)
    const headerRow = rows[0] || [];
    const customFieldsHeader: string[] = [];
    for (let i = 23; i < headerRow.length; i++) { // Start at column X (index 23)
      const header = headerRow[i];
      if (header && typeof header === 'string' && header.trim() !== '') {
        customFieldsHeader.push(header.trim());
      }
    }

    if (customFieldsHeader.length > 0) {
      console.log(`Found ${customFieldsHeader.length} custom field columns:`, customFieldsHeader);
    }

    // Pula a primeira linha (cabeçalho) e processa os dados
    const militares: RawMilitaryData[] = [];
    let skippedRows = 0;

    for (let i = 1; i < rows.length; i++) {
      const parsed = parseRow(rows[i], customFieldsHeader);
      if (parsed) {
        militares.push(parsed);
      } else {
        skippedRows++;
      }
    }

    console.log(`Parsed ${militares.length} valid military personnel records`);
    console.log(`Skipped ${skippedRows} invalid/empty rows`);

    // IMPORTANTE: Usa transação para garantir atomicidade (all-or-nothing)
    // Se falhar no meio, nada é perdido (rollback automático)
    console.log('Starting database transaction...');

    const imported = await db.transaction(async (tx: any) => {
      // 1. Limpa dados existentes dentro da transação
      console.log('Clearing existing military personnel data...');
      await tx.delete(militaryPersonnel);
      console.log('Cleared existing military personnel data');

      // 2. Fetch custom field definitions ONCE (performance optimization)
      const fieldDefinitions = await db.select().from(customFieldDefinitions);
      console.log(`Found ${fieldDefinitions.length} custom field definitions`);

      // 3. Validate and normalize all custom fields before inserting
      console.log('Validating and normalizing custom fields...');
      const validatedMilitares = await Promise.all(
        militares.map(async (militar) => {
          if (militar.customFields) {
            try {
              const normalized = await validateAndNormalizeCustomFields(militar.customFields, fieldDefinitions);
              return { ...militar, customFields: normalized };
            } catch (error) {
              console.warn(`Validation failed for row:`, error instanceof Error ? error.message : String(error));
              // Skip rows with validation errors
              return null;
            }
          }
          return militar;
        })
      );

      // Filter out null entries (validation failures)
      const validMilitares = validatedMilitares.filter(m => m !== null) as RawMilitaryData[];
      const failedCount = militares.length - validMilitares.length;
      console.log(`✓ Validated ${validMilitares.length}/${militares.length} records (${failedCount} failed validation and were skipped)`);

      // 4. Importa em lotes para performance
      const batchSize = 100;
      let count = 0;

      for (let i = 0; i < validMilitares.length; i += batchSize) {
        const batch = validMilitares.slice(i, i + batchSize);
        await tx.insert(militaryPersonnel).values(batch);
        count += batch.length;
        console.log(`Imported ${count}/${validMilitares.length} records...`);
      }

      return count;
    });

    console.log(`✓ Transaction committed - Successfully imported ${imported} military personnel records`);

    return {
      success: true,
      total: imported,
      skipped: skippedRows
    };
  } catch (error) {
    console.error("Error importing from Google Sheets:", error);
    throw error;
  }
}

// Função auxiliar para extrair ID da planilha de uma URL
export function extractSpreadsheetId(urlOrId: string): string {
  // Se já é um ID (sem /)
  if (!urlOrId.includes('/')) {
    return urlOrId;
  }

  // Extrai ID de URL do Google Sheets
  // https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  throw new Error('Invalid Google Sheets URL or ID');
}
