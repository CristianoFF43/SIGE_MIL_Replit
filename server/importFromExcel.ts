import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import { db } from "./db";
import { militaryPersonnel, customFieldDefinitions, type CustomFieldDefinition } from "@shared/schema";
import { validateAndNormalizeCustomFields } from "./storage";

async function getGoogleDriveClient() {
  // Use Firebase Admin credentials which are already set up for the project
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
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

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

// Mapeamento de nomes de cabeçalhos para campos padrão (case-insensitive, aceita variações)
const FIELD_MAPPINGS: Record<string, string> = {
  'ord': 'ord',
  'p/grad': 'postoGraduacao',
  'posto/graduacao': 'postoGraduacao',
  'posto graduacao': 'postoGraduacao',
  'postograduacao': 'postoGraduacao',
  'posto': 'postoGraduacao',
  'graduacao': 'postoGraduacao',
  'a/q/s': 'armaQuadroServico',
  'arma/quadro/servico': 'armaQuadroServico',
  'arma': 'armaQuadroServico',
  'nome completo': 'nomeCompleto',
  'nomecompleto': 'nomeCompleto',
  'nome': 'nomeCompleto',
  'nome guerra': 'nomeGuerra',
  'nomeguerra': 'nomeGuerra',
  'guerra': 'nomeGuerra',
  'cia': 'companhia',
  'companhia': 'companhia',
  'sec/fracao': 'secaoFracao',
  'seção/fracao': 'secaoFracao',
  'secao/fracao': 'secaoFracao',
  'seção/fração': 'secaoFracao',
  'sec / fracao': 'secaoFracao',
  'seção / fração': 'secaoFracao',
  'secao': 'secaoFracao',
  'fracao': 'secaoFracao',
  'fração': 'secaoFracao',
  'funcao': 'funcao',
  'função': 'funcao',
  'data/praca': 'dataPraca',
  'data praca': 'dataPraca',
  'data': 'dataPraca',
  'praca': 'dataPraca',
  'curso': 'curso',
  'situacao': 'situacao',
  'situação': 'situacao',
  'missao/op': 'missaoOp',
  'missão/op': 'missaoOp',
  'missao': 'missaoOp',
  'missão': 'missaoOp',
  'op': 'missaoOp',
  'cpf': 'cpf',
  'identidade': 'identidade',
  'endereco': 'endereco',
  'endereço': 'endereco',
  'nº': 'numeroResidencia',
  'numero': 'numeroResidencia',
  'número': 'numeroResidencia',
  'numero residencia': 'numeroResidencia',
  'bairro': 'bairro',
  'ponto referencia': 'pontoReferencia',
  'ponto referência': 'pontoReferencia',
  'referencia': 'pontoReferencia',
  'cidade': 'cidade',
  'telefone 1': 'telefoneContato1',
  'telefone1': 'telefoneContato1',
  'telefone': 'telefoneContato1',
  'tel1': 'telefoneContato1',
  'telefone 2': 'telefoneContato2',
  'telefone2': 'telefoneContato2',
  'tel2': 'telefoneContato2',
  'email': 'email',
  'e-mail': 'email',
  'obs': 'observacoes',
  'observacoes': 'observacoes',
  'observações': 'observacoes',
  'observacao': 'observacoes',
  'temp': 'temp',
  'tempo': 'temp',
  'temporario': 'temp',
  'temporário': 'temp',
  't': 'temp',
};

// Remove espaços extras e converte para string
const cleanStr = (val: any) => {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim();
  return str === '' ? undefined : str;
};

const cleanNum = (val: any) => {
  if (!val) return undefined;
  // Se for string "Ord", "Nr", etc, retorna undefined (evita header repetido)
  if (typeof val === 'string' && /^(ord|nr|num|núm)/i.test(val.trim())) return undefined;

  const num = parseInt(String(val).trim());
  return isNaN(num) ? undefined : num;
};

// Mapeia cabeçalho para campo padrão (ou retorna null se for campo customizado)
function mapHeaderToField(header: string): string | null {
  const normalized = header.toLowerCase().trim();
  return FIELD_MAPPINGS[normalized] || null;
}

interface ColumnMapping {
  index: number;
  fieldName: string;
  isStandard: boolean; // true = campo padrão, false = campo customizado
}

// Cria mapeamento de colunas baseado nos cabeçalhos
function createColumnMapping(headerRow: any[]): ColumnMapping[] {
  const mapping: ColumnMapping[] = [];

  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (!header || typeof header !== 'string' || header.trim() === '') {
      continue; // Pula colunas sem cabeçalho
    }

    const headerStr = header.trim();
    const standardField = mapHeaderToField(headerStr);

    if (standardField) {
      // Campo padrão reconhecido
      mapping.push({
        index: i,
        fieldName: standardField,
        isStandard: true,
      });
    } else {
      // Campo customizado (qualquer coluna não reconhecida)
      mapping.push({
        index: i,
        fieldName: headerStr,
        isStandard: false,
      });
    }
  }

  return mapping;
}

function parseRow(row: any[], columnMapping: ColumnMapping[]): RawMilitaryData | null {
  // Pula linhas vazias
  if (!row || row.length === 0) return null;
  if (row.every((cell: any) => cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === ''))) {
    return null;
  }

  const result: any = {
    customFields: {},
  };

  // Aplica o mapeamento de colunas
  for (const mapping of columnMapping) {
    const value = row[mapping.index];

    if (mapping.isStandard) {
      // Campo padrão
      if (mapping.fieldName === 'ord') {
        result.ord = cleanNum(value);
      } else {
        result[mapping.fieldName] = cleanStr(value);
      }
    } else {
      // Campo customizado
      const cleanValue = cleanStr(value);
      if (cleanValue !== undefined) {
        result.customFields[mapping.fieldName] = cleanValue;
      }
    }
  }

  // Validação: campos obrigatórios
  // Se parecer um cabeçalho repetido (ex: nomeCompleto == "Nome Completo"), ignora
  if (result.nomeCompleto && /^(nome|nome completo|name)$/i.test(result.nomeCompleto)) {
    return null;
  }

  if (!result.postoGraduacao || !result.nomeCompleto || !result.companhia) {
    // Log para debug (opcional, mas útil)
    // console.log('Skipping invalid row:', JSON.stringify(result));
    return null; // Linha inválida sem campos obrigatórios
  }

  // Garante que campos obrigatórios não sejam undefined
  result.postoGraduacao = result.postoGraduacao || '';
  result.nomeCompleto = result.nomeCompleto || '';
  result.companhia = result.companhia || '';

  // Se não há custom fields, remove o objeto
  if (Object.keys(result.customFields).length === 0) {
    delete result.customFields;
  }

  return result as RawMilitaryData;
}

export async function importFromExcelFile(fileId: string) {
  try {
    console.log(`Starting import from Excel file: ${fileId}`);

    const drive = await getGoogleDriveClient();

    // Baixa o arquivo do Google Drive
    console.log('Downloading file from Google Drive...');
    let response;

    try {
      // Tenta baixar como arquivo binário (para arquivos Excel enviados via upload)
      response = await drive.files.get({
        fileId: fileId,
        alt: 'media',
      }, {
        responseType: 'arraybuffer'
      });
    } catch (downloadError: any) {
      console.log('Direct download failed, trying to export as Excel (likely a native Google Sheet)...');
      // Se falhar, tenta exportar como Excel (para planilhas nativas do Google Sheets)
      response = await drive.files.export({
        fileId: fileId,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }, {
        responseType: 'arraybuffer'
      });
    }

    // Processa o arquivo Excel
    console.log('Processing Excel file...');
    const workbook = XLSX.read(response.data, { type: 'buffer' });

    // Pega a primeira aba
    const sheetName = workbook.SheetNames[0];
    console.log(`Reading sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Converte para array de arrays
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Found ${rawData.length} rows in Excel file`);

    // Cria mapeamento dinâmico de colunas baseado nos cabeçalhos
    const headerRow = rawData[0] || [];
    const columnMapping = createColumnMapping(headerRow);

    const standardFields = columnMapping.filter(m => m.isStandard);
    const customFields = columnMapping.filter(m => !m.isStandard);

    console.log(`📋 Mapped ${standardFields.length} standard fields`);
    if (customFields.length > 0) {
      console.log(`🔧 Found ${customFields.length} custom field columns:`, customFields.map(f => f.fieldName));
    }

    // Pula a primeira linha (cabeçalho) e processa os dados
    const militares: RawMilitaryData[] = [];
    let skippedRows = 0;

    for (let i = 1; i < rawData.length; i++) {
      const parsed = parseRow(rawData[i], columnMapping);
      if (parsed) {
        militares.push(parsed);
      } else {
        skippedRows++;
      }
    }

    console.log(`✓ Parsed ${militares.length} valid military personnel records`);
    console.log(`⚠ Skipped ${skippedRows} invalid/empty rows`);

    // Mostra algumas estatísticas
    const semOrd = militares.filter(m => !m.ord).length;
    console.log(`📊 Militares sem numeração (ORD): ${semOrd}`);

    // Auto-criar definições de campos customizados se não existirem
    if (customFields.length > 0) {
      console.log('🔧 Ensuring custom field definitions exist...');
      const existingDefs = await db.select().from(customFieldDefinitions);
      const existingNames = new Set(existingDefs.map((d: any) => d.name));
      let orderIndex = existingDefs.length;

      for (const field of customFields) {
        if (!existingNames.has(field.fieldName)) {
          console.log(`  ➕ Creating definition for custom field: ${field.fieldName}`);
          await db.insert(customFieldDefinitions).values({
            id: crypto.randomUUID(),
            name: field.fieldName,
            label: field.fieldName,
            fieldType: 'text',
            required: 0,
            options: null,
            orderIndex: orderIndex++,
          } as any);
          existingNames.add(field.fieldName);
        }
      }
    }

    // IMPORTANTE: Usa transação para garantir atomicidade (all-or-nothing)
    // Se falhar no meio, nada é perdido (rollback automático)
    console.log('🔒 Starting database transaction...');

    const imported = await db.transaction(async (tx: any) => {
      // 1. Limpa dados existentes dentro da transação
      console.log('🗑️  Clearing existing military personnel data...');
      await tx.delete(militaryPersonnel);
      console.log('✓ Existing data cleared');

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
        console.log(`📥 Imported ${count}/${validMilitares.length} records (${Math.round(count / validMilitares.length * 100)}%)...`);
      }

      return count;
    });

    console.log(`\n✅ Transaction committed - Successfully imported ${imported} military personnel records`);

    return {
      success: true,
      total: imported,
      skipped: skippedRows,
      semNumeracao: semOrd
    };
  } catch (error) {
    console.error("Error importing from Excel file:", error);
    throw error;
  }
}

// Importa a partir de um buffer (CSV ou XLSX) enviado via upload
export async function importFromBuffer(buffer: Buffer) {
  try {
    console.log('Starting import from uploaded buffer...');

    // Processa o arquivo (CSV ou XLSX)
    console.log('Processing uploaded file...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Pega a primeira aba
    const sheetName = workbook.SheetNames[0];
    console.log(`Reading sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Converte para array de arrays
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Found ${rawData.length} rows in uploaded file`);

    // Cria mapeamento dinâmico de colunas baseado nos cabeçalhos
    const headerRow = rawData[0] || [];
    const columnMapping = createColumnMapping(headerRow);

    const standardFields = columnMapping.filter(m => m.isStandard);
    const customFields = columnMapping.filter(m => !m.isStandard);

    console.log(`📋 Mapped ${standardFields.length} standard fields`);
    if (customFields.length > 0) {
      console.log(`🔧 Found ${customFields.length} custom field columns:`, customFields.map(f => f.fieldName));
    }

    // Pula a primeira linha (cabeçalho) e processa os dados
    const militares: RawMilitaryData[] = [];
    let skippedRows = 0;

    for (let i = 1; i < rawData.length; i++) {
      const parsed = parseRow(rawData[i], columnMapping);
      if (parsed) {
        militares.push(parsed);
      } else {
        skippedRows++;
      }
    }

    console.log(`✓ Parsed ${militares.length} valid military personnel records`);
    console.log(`⚠ Skipped ${skippedRows} invalid/empty rows`);

    // Mostra algumas estatísticas
    const semOrd = militares.filter(m => !m.ord).length;
    console.log(`📊 Militares sem numeração (ORD): ${semOrd}`);

    // Auto-criar definições de campos customizados se não existirem
    if (customFields.length > 0) {
      console.log('🔧 Ensuring custom field definitions exist...');
      const existingDefs = await db.select().from(customFieldDefinitions);
      const existingNames = new Set(existingDefs.map((d: CustomFieldDefinition) => d.name));
      let orderIndex = existingDefs.length;

      for (const field of customFields) {
        if (!existingNames.has(field.fieldName)) {
          console.log(`  ➕ Creating definition for custom field: ${field.fieldName}`);
          await db.insert(customFieldDefinitions).values({
            id: crypto.randomUUID(),
            name: field.fieldName,
            label: field.fieldName,
            fieldType: 'text',
            required: 0,
            options: null,
            orderIndex: orderIndex++,
          } as any);
          existingNames.add(field.fieldName);
        }
      }
    }

    // IMPORTANTE: Usa transação para garantir atomicidade
    console.log('🔒 Starting database transaction...');

    const imported = await db.transaction(async (tx: any) => {
      // 1. Limpa dados existentes
      console.log('🗑️  Clearing existing military personnel data...');
      await tx.delete(militaryPersonnel);
      console.log('✓ Existing data cleared');

      // 2. Fetch custom field definitions
      const fieldDefinitions = await db.select().from(customFieldDefinitions);
      console.log(`Found ${fieldDefinitions.length} custom field definitions`);

      // 3. Valida e normaliza campos customizados
      console.log('Validating and normalizing custom fields...');
      const validatedMilitares = await Promise.all(
        militares.map(async (militar) => {
          if (militar.customFields) {
            try {
              const normalized = await validateAndNormalizeCustomFields(militar.customFields, fieldDefinitions);
              return { ...militar, customFields: normalized };
            } catch (error) {
              console.warn(`Validation failed for row:`, error instanceof Error ? error.message : String(error));
              return null;
            }
          }
          return militar;
        })
      );

      const validMilitares = validatedMilitares.filter(m => m !== null) as RawMilitaryData[];
      const failedCount = militares.length - validMilitares.length;
      console.log(`✓ Validated ${validMilitares.length}/${militares.length} records (${failedCount} failed validation and were skipped)`);

      // 4. Importa em lotes
      const batchSize = 100;
      let count = 0;

      for (let i = 0; i < validMilitares.length; i += batchSize) {
        const batch = validMilitares.slice(i, i + batchSize);
        await tx.insert(militaryPersonnel).values(batch);
        count += batch.length;
        console.log(`📥 Imported ${count}/${validMilitares.length} records (${Math.round(count / validMilitares.length * 100)}%)...`);
      }

      return count;
    });

    console.log(`\n✅ Upload import committed - Successfully imported ${imported} records`);

    return {
      success: true,
      total: imported,
      skipped: skippedRows,
      semNumeracao: semOrd,
    };
  } catch (error) {
    console.error('Error importing from uploaded buffer:', error);
    throw error;
  }
}

// Extrai ID do arquivo de uma URL do Google Drive
export function extractFileId(urlOrId: string): string {
  // Se já é um ID (sem /)
  if (!urlOrId.includes('/')) {
    return urlOrId;
  }

  // Extrai ID de URL do Google Drive
  // https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  throw new Error('Invalid Google Drive URL or ID');
}
