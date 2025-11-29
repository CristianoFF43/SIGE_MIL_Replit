import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MilitaryPersonnel, CustomFieldDefinition } from '@shared/schema';

interface ExportFilters {
  companhia?: string;
  posto?: string;
  situacao?: string;
  missaoOp?: string;
  search?: string;
}

/**
 * Aplica filtros aos dados de militares
 */
export function applyFilters(militares: MilitaryPersonnel[], filters: ExportFilters): MilitaryPersonnel[] {
  let filtered = [...militares];

  if (filters.companhia) {
    filtered = filtered.filter(m => m.companhia === filters.companhia);
  }

  if (filters.posto) {
    filtered = filtered.filter(m => m.postoGraduacao === filters.posto);
  }

  if (filters.situacao) {
    filtered = filtered.filter(m => m.situacao === filters.situacao);
  }

  if (filters.missaoOp) {
    filtered = filtered.filter(m => m.missaoOp === filters.missaoOp);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(m => 
      m.nomeCompleto.toLowerCase().includes(searchLower) ||
      m.nomeGuerra?.toLowerCase().includes(searchLower) ||
      m.cpf?.includes(filters.search!) ||
      m.identidade?.includes(filters.search!)
    );
  }

  return filtered;
}

/**
 * Gera arquivo Excel com formatação profissional
 */
export function generateExcel(militares: MilitaryPersonnel[], customFields: CustomFieldDefinition[] = []): Buffer {
  // Prepara os dados para exportação
  const data = militares.map(m => {
    const baseData: Record<string, any> = {
      'ORD': m.ord || '',
      'P/GRAD': m.postoGraduacao,
      'ARMA/QUADRO/SERV': m.armaQuadroServico || '',
      'NOME COMPLETO': m.nomeCompleto,
      'NOME GUERRA': m.nomeGuerra || '',
      'CIA': m.companhia,
      'SEÇÃO/FRAÇÃO': m.secaoFracao || '',
      'FUNÇÃO': m.funcao || '',
      'SITUAÇÃO': m.situacao || '',
      'MISSÃO': m.missaoOp || '',
      'CURSO': m.curso || '',
      'IDENTIDADE': m.identidade || '',
      'CPF': m.cpf || '',
      'TELEFONE': m.telefoneContato1 || '',
      'EMAIL': m.email || '',
    };

    // Add custom fields
    const militarCustomFields = (m.customFields as Record<string, any>) || {};
    customFields.forEach(field => {
      baseData[field.label] = militarCustomFields[field.name] || '';
    });

    return baseData;
  });

  // Cria workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Define larguras das colunas para melhor visualização
  const colWidths = [
    { wch: 6 },  // ORD
    { wch: 10 }, // P/GRAD
    { wch: 15 }, // ARMA/QUADRO/SERV
    { wch: 35 }, // NOME COMPLETO
    { wch: 15 }, // NOME GUERRA
    { wch: 10 }, // CIA
    { wch: 15 }, // SEÇÃO/FRAÇÃO
    { wch: 25 }, // FUNÇÃO
    { wch: 12 }, // SITUAÇÃO
    { wch: 12 }, // MISSÃO
    { wch: 15 }, // CURSO
    { wch: 12 }, // IDENTIDADE
    { wch: 15 }, // CPF
    { wch: 15 }, // TELEFONE
    { wch: 30 }, // EMAIL
    ...customFields.map(() => ({ wch: 20 })), // Custom fields columns
  ];
  ws['!cols'] = colWidths;

  // Adiciona worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Efetivo Militar');

  // Gera buffer do arquivo Excel
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer as Buffer;
}

/**
 * Gera arquivo PDF com formatação profissional militar
 */
export function generatePDF(militares: MilitaryPersonnel[], customFields: CustomFieldDefinition[] = []): Buffer {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Cabeçalho do documento
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EXÉRCITO BRASILEIRO', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('7º BATALHÃO DE INFANTARIA DE SELVA', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO DE EFETIVO MILITAR', pageWidth / 2, 29, { align: 'center' });
  
  // Data e hora do relatório
  const now = new Date();
  const dataHora = `${now.toLocaleDateString('pt-BR')} - ${now.toLocaleTimeString('pt-BR')}`;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${dataHora}`, pageWidth / 2, 35, { align: 'center' });
  doc.setTextColor(0);

  // Total de militares
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de militares: ${militares.length}`, 14, 42);

  // Prepara dados da tabela
  const tableData = militares.map(m => {
    const baseRow = [
      m.ord || '-',
      m.postoGraduacao,
      m.nomeCompleto,
      m.nomeGuerra || '-',
      m.companhia,
      m.secaoFracao || '-',
      m.funcao || '-',
      m.situacao || '-',
      m.missaoOp || '-',
    ];

    // Add custom fields
    const militarCustomFields = (m.customFields as Record<string, any>) || {};
    const customFieldsData = customFields.map(field => militarCustomFields[field.name] || '-');

    return [...baseRow, ...customFieldsData];
  });

  // Prepara cabeçalhos da tabela
  const baseHeaders = ['ORD', 'P/GRAD', 'NOME COMPLETO', 'NOME GUERRA', 'CIA', 'SEÇ/FRAÇÃO', 'FUNÇÃO', 'SITUAÇÃO', 'MISSÃO'];
  const customFieldHeaders = customFields.map(field => field.label);
  const allHeaders = [...baseHeaders, ...customFieldHeaders];

  // Gera tabela com autoTable
  autoTable(doc, {
    head: [allHeaders],
    body: tableData,
    startY: 47,
    theme: 'grid',
    headStyles: {
      fillColor: [76, 175, 80], // Verde militar
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },  // ORD
      1: { cellWidth: 16, halign: 'center' },  // P/GRAD
      2: { cellWidth: 55 },                     // NOME COMPLETO
      3: { cellWidth: 22, halign: 'center' },  // NOME GUERRA
      4: { cellWidth: 18, halign: 'center' },  // CIA
      5: { cellWidth: 22, halign: 'center' },  // SEÇ/FRAÇÃO
      6: { cellWidth: 35 },                     // FUNÇÃO
      7: { cellWidth: 22, halign: 'center' },  // SITUAÇÃO
      8: { cellWidth: 22, halign: 'center' },  // MISSÃO
    },
    didDrawPage: function(data: any) {
      // Rodapé com número da página
      const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc as any).internal.pages.length - 1;
      const currentPage = data.pageNumber || 1;
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Página ${currentPage} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      doc.text(
        '7º BIS - Sistema de Gestão de Efetivo',
        14,
        doc.internal.pageSize.getHeight() - 10
      );
      
      doc.setTextColor(0);
    },
    margin: { top: 47, left: 14, right: 14, bottom: 20 },
  });

  // Retorna buffer do PDF
  return Buffer.from(doc.output('arraybuffer'));
}
