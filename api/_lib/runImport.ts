// Script temporário para executar importação de arquivo Excel do Google Drive
import { importFromExcelFile, extractFileId } from './importFromExcel';

const FILE_URL = 'https://docs.google.com/spreadsheets/d/1SsKGtgZwMX5UFFexM_MPNfd_M3iDqGij/edit?usp=sharing&ouid=115100256178953593994&rtpof=true&sd=true';

async function runImport() {
  try {
    console.log('🚀 Iniciando importação do arquivo Excel...');
    console.log(`📋 URL: ${FILE_URL}`);
    
    const fileId = extractFileId(FILE_URL);
    console.log(`📊 ID do arquivo: ${fileId}`);
    console.log('');
    
    const result = await importFromExcelFile(fileId);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📈 Total de militares importados: ${result.total}`);
    console.log(`👤 Militares SEM numeração (Cb, Sd EP, Sd EV): ${result.semNumeracao}`);
    console.log(`⚠️  Linhas ignoradas (vazias/inválidas): ${result.skipped}`);
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERRO NA IMPORTAÇÃO');
    console.error('='.repeat(60));
    console.error(`Mensagem: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

runImport();
