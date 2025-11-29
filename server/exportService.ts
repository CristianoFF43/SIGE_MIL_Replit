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
export function generateExcel(militares: MilitaryPersonnel[], customFields: CustomFieldDefinition[] = [], selectedColumns?: string[]): Buffer {
  // Prepara os dados para exportação
  const data = militares.map(m => {
    const allData: Record<string, any> = {
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
      allData[field.label] = militarCustomFields[field.name] || '';
    });

    // Filter by selected columns if provided
    if (selectedColumns && selectedColumns.length > 0) {
      const filteredData: Record<string, any> = {};
      selectedColumns.forEach(col => {
        if (allData[col] !== undefined) {
          filteredData[col] = allData[col];
        }
      });
      return filteredData;
    }

    return allData;
  });

  // Cria workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Define larguras das colunas para melhor visualização
  // Se houver colunas selecionadas, ajusta largura apenas para elas
  const defaultWidths: Record<string, number> = {
    'ORD': 6,
    'P/GRAD': 10,
    'ARMA/QUADRO/SERV': 15,
    'NOME COMPLETO': 35,
    'NOME GUERRA': 15,
    'CIA': 10,
    'SEÇÃO/FRAÇÃO': 15,
    'FUNÇÃO': 25,
    'SITUAÇÃO': 12,
    'MISSÃO': 12,
    'CURSO': 15,
    'IDENTIDADE': 12,
    'CPF': 15,
    'TELEFONE': 15,
    'EMAIL': 30
  };

  const headers = selectedColumns && selectedColumns.length > 0
    ? selectedColumns
    : Object.keys(data[0] || {});

  const colWidths = headers.map(header => ({
    wch: defaultWidths[header] || 20 // Default width for custom fields or unknown columns
  }));

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
export function generatePDF(militares: MilitaryPersonnel[], customFields: CustomFieldDefinition[] = [], selectedColumns?: string[]): Buffer {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Cabeçalho do documento
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EXÉRCITO BRASILEIRO', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(14);
  doc.text('7º BATALHÃO DE INFANTARIA DE SELVA', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO DE EFETIVO MILITAR', pageWidth / 2, 22, { align: 'center' });

  // Data e hora do relatório
  const now = new Date();
  const dataHora = `${now.toLocaleDateString('pt-BR')} - ${now.toLocaleTimeString('pt-BR')}`;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${dataHora}`, pageWidth / 2, 27, { align: 'center' });
  doc.setTextColor(0);

  // Total de militares
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de militares: ${militares.length}`, 5, 33);

  // Definição de todos os dados possíveis
  const allHeadersMap: Record<string, (m: MilitaryPersonnel) => string> = {
    'ORD': m => m.ord?.toString() || '-',
    'P/GRAD': m => m.postoGraduacao,
    'ARMA/QUADRO/SERV': m => m.armaQuadroServico || '-',
    'NOME COMPLETO': m => m.nomeCompleto,
    'NOME GUERRA': m => m.nomeGuerra || '-',
    'CIA': m => m.companhia,
    'SEÇÃO/FRAÇÃO': m => m.secaoFracao || '-',
    'FUNÇÃO': m => m.funcao || '-',
    'SITUAÇÃO': m => m.situacao || '-',
    'MISSÃO': m => m.missaoOp || '-',
    'CURSO': m => m.curso || '-',
    'IDENTIDADE': m => m.identidade || '-',
    'CPF': m => m.cpf || '-',
    'TELEFONE': m => m.telefoneContato1 || '-',
    'EMAIL': m => m.email || '-'
  };

  // Add custom fields accessors
  customFields.forEach(field => {
    allHeadersMap[field.label] = m => {
      const cf = (m.customFields as Record<string, any>) || {};
      return cf[field.name] || '-';
    };
  });

  // Determine headers to use
  const headersToUse = selectedColumns && selectedColumns.length > 0
    ? selectedColumns
    : ['ORD', 'P/GRAD', 'NOME COMPLETO', 'NOME GUERRA', 'CIA', 'SEÇ/FRAÇÃO', 'FUNÇÃO', 'SITUAÇÃO', 'MISSÃO'];

  // Prepara dados da tabela
  const tableData = militares.map(m => {
    return headersToUse.map(header => {
      const accessor = allHeadersMap[header];
      return accessor ? accessor(m) : '-';
    });
  });

  // Gera tabela com autoTable
  autoTable(doc, {
    head: [headersToUse],
    body: tableData,
    startY: 36,
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
      cellPadding: 1, // Reduced padding
    },
    // Compact layout settings
    styles: {
      overflow: 'ellipsize', // Prevent expansion, truncate if needed
      cellWidth: 'auto',
      minCellHeight: 5,
    },
    // Specific column styles to keep it compact
    columnStyles: {
      // ORD usually small
      0: { cellWidth: 'auto', halign: 'center' },
    },
    didDrawPage: function (data: any) {
      // Rodapé com número da página
      const str = 'Página ' + doc.internal.getNumberOfPages();

      doc.setFontSize(8);
      doc.setTextColor(100);

      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

      doc.text(
        str + ' de {total_pages_count_string}',
        data.settings.margin.left,
        pageHeight - 5
      );

      doc.text(
        '7º BIS - Sistema de Gestão de Efetivo',
        pageWidth - 60,
        pageHeight - 5
      );

      doc.setTextColor(0);
    },
    margin: { top: 36, left: 5, right: 5, bottom: 10 }, // Narrow margins
  });

  // Replace total pages alias
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages('{total_pages_count_string}');
  }

  // Retorna buffer do PDF
  return Buffer.from(doc.output('arraybuffer'));
}
