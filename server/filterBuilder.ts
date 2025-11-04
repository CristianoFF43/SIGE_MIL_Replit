import { and, or, eq, ne, inArray, notInArray, like, ilike, gt, lt, gte, lte, SQL, sql } from 'drizzle-orm';
import { militaryPersonnel, filterComparators } from '@shared/schema';
import type { FilterTree, FilterCondition, FilterGroup } from '@shared/schema';

/**
 * Mapeia nomes de campos para colunas do Drizzle
 */
const fieldMap: Record<string, any> = {
  'postoGraduacao': militaryPersonnel.postoGraduacao,
  'companhia': militaryPersonnel.companhia,
  'situacao': militaryPersonnel.situacao,
  'missaoOp': militaryPersonnel.missaoOp,
  'nomeCompleto': militaryPersonnel.nomeCompleto,
  'nomeGuerra': militaryPersonnel.nomeGuerra,
  'funcao': militaryPersonnel.funcao,
  'armaQuadroServico': militaryPersonnel.armaQuadroServico,
  'cpf': militaryPersonnel.cpf,
  'identidade': militaryPersonnel.identidade,
  'ord': militaryPersonnel.ord,
  'telefone': militaryPersonnel.telefoneContato1,
  'email': militaryPersonnel.email,
  'secaoFracao': militaryPersonnel.secaoFracao,
};

/**
 * Builds SQL predicate for custom field filters (JSONB queries)
 * Custom fields are stored as: { "fieldName": "value", ... }
 */
function buildCustomFieldPredicate(
  fieldName: string,
  comparator: typeof filterComparators[number],
  value: string | number | string[]
): SQL | undefined {
  // JSONB extraction: customFields->>'fieldName' returns text
  const jsonbExtract = sql`${militaryPersonnel.customFields}->>${fieldName}`;
  
  switch (comparator) {
    case '=':
      return sql`${jsonbExtract} = ${value}`;
    
    case '!=':
      return sql`${jsonbExtract} != ${value}`;
    
    case 'IN':
      if (!Array.isArray(value)) {
        console.warn(`Valor deve ser array para operador IN`);
        return undefined;
      }
      // For IN with JSONB, we need to check if extracted value is in the array
      // Use sql.join to properly bind the array values
      if (value.length === 0) return undefined;
      const inValues = value.map(v => sql`${v}`);
      return sql`${jsonbExtract} IN (${sql.join(inValues, sql`, `)})`;
    
    case 'NOT IN':
      if (!Array.isArray(value)) {
        console.warn(`Valor deve ser array para operador NOT IN`);
        return undefined;
      }
      // Use sql.join to properly bind the array values
      if (value.length === 0) return undefined;
      const notInValues = value.map(v => sql`${v}`);
      return sql`${jsonbExtract} NOT IN (${sql.join(notInValues, sql`, `)})`;
    
    case 'LIKE':
      return sql`${jsonbExtract} LIKE ${value}`;
    
    case 'ILIKE':
      return sql`${jsonbExtract} ILIKE ${value}`;
    
    case '>':
      // For numeric comparisons, cast to numeric
      return sql`(${jsonbExtract})::numeric > ${value}`;
    
    case '<':
      return sql`(${jsonbExtract})::numeric < ${value}`;
    
    case '>=':
      return sql`(${jsonbExtract})::numeric >= ${value}`;
    
    case '<=':
      return sql`(${jsonbExtract})::numeric <= ${value}`;
    
    default:
      console.warn(`Comparador desconhecido: ${comparator}`);
      return undefined;
  }
}

/**
 * Converte uma condição de filtro em predicado SQL do Drizzle
 * Suporta campos padrão e customFields JSONB
 */
function buildConditionPredicate(condition: FilterCondition): SQL | undefined {
  const fieldStr = condition.field as string;
  
  // Check if it's a custom field (pattern: customFields.fieldName)
  if (fieldStr.startsWith('customFields.')) {
    const customFieldName = fieldStr.substring('customFields.'.length);
    return buildCustomFieldPredicate(customFieldName, condition.comparator, condition.value);
  }
  
  const column = fieldMap[fieldStr];
  
  if (!column) {
    console.warn(`Campo desconhecido no filtro: ${fieldStr}`);
    return undefined;
  }

  const { comparator, value } = condition;

  switch (comparator) {
    case '=':
      return eq(column, value as string);
    
    case '!=':
      return ne(column, value as string);
    
    case 'IN':
      if (!Array.isArray(value)) {
        console.warn(`Valor deve ser array para operador IN`);
        return undefined;
      }
      return inArray(column, value);
    
    case 'NOT IN':
      if (!Array.isArray(value)) {
        console.warn(`Valor deve ser array para operador NOT IN`);
        return undefined;
      }
      return notInArray(column, value);
    
    case 'LIKE':
      return like(column, value as string);
    
    case 'ILIKE':
      return ilike(column, value as string);
    
    case '>':
      return gt(column, value as string | number);
    
    case '<':
      return lt(column, value as string | number);
    
    case '>=':
      return gte(column, value as string | number);
    
    case '<=':
      return lte(column, value as string | number);
    
    default:
      console.warn(`Comparador desconhecido: ${comparator}`);
      return undefined;
  }
}

/**
 * Converte um grupo de filtros (com AND/OR) em predicado SQL do Drizzle
 */
function buildGroupPredicate(group: FilterGroup): SQL | undefined {
  const predicates: SQL[] = [];

  for (const child of group.children) {
    let predicate: SQL | undefined;
    
    if (child.type === 'condition') {
      predicate = buildConditionPredicate(child);
    } else {
      predicate = buildGroupPredicate(child);
    }

    if (predicate) {
      predicates.push(predicate);
    }
  }

  if (predicates.length === 0) {
    return undefined;
  }

  if (predicates.length === 1) {
    return predicates[0];
  }

  return group.operator === 'AND' 
    ? and(...predicates)
    : or(...predicates);
}

/**
 * Converte uma árvore de filtros completa em predicado SQL do Drizzle
 * 
 * @param filterTree - Árvore de filtros com grupos e condições
 * @returns Predicado SQL do Drizzle ou undefined se a árvore estiver vazia
 * 
 * @example
 * const tree: FilterTree = {
 *   type: "group",
 *   operator: "AND",
 *   children: [
 *     { type: "condition", field: "companhia", comparator: "=", value: "1ª CIA" },
 *     {
 *       type: "group",
 *       operator: "OR",
 *       children: [
 *         { type: "condition", field: "postoGraduacao", comparator: "IN", value: ["1º Sgt", "2º Sgt", "3º Sgt"] },
 *         { type: "condition", field: "postoGraduacao", comparator: "=", value: "Cb" }
 *       ]
 *     }
 *   ]
 * };
 * 
 * const predicate = buildFilterPredicate(tree);
 * // Resulta em: companhia = '1ª CIA' AND (postoGraduacao IN ('1º Sgt', '2º Sgt', '3º Sgt') OR postoGraduacao = 'Cb')
 */
export function buildFilterPredicate(filterTree: FilterTree): SQL | undefined {
  return buildGroupPredicate(filterTree);
}

/**
 * Converte filtros simples (antigo sistema) em FilterTree
 * Garante compatibilidade retroativa
 */
export function simpleFiltersToTree(filters: {
  companhia?: string;
  posto?: string;
  situacao?: string;
  missaoOp?: string;
  search?: string;
}): FilterTree {
  const conditions: FilterCondition[] = [];

  if (filters.companhia) {
    conditions.push({
      type: "condition",
      field: "companhia",
      comparator: "=",
      value: filters.companhia,
    });
  }

  if (filters.posto) {
    conditions.push({
      type: "condition",
      field: "postoGraduacao",
      comparator: "=",
      value: filters.posto,
    });
  }

  if (filters.situacao) {
    conditions.push({
      type: "condition",
      field: "situacao",
      comparator: "=",
      value: filters.situacao,
    });
  }

  if (filters.missaoOp) {
    conditions.push({
      type: "condition",
      field: "missaoOp",
      comparator: "=",
      value: filters.missaoOp,
    });
  }

  if (filters.search) {
    // Busca textual - cria um grupo OR para buscar em múltiplos campos
    const searchGroup: FilterGroup = {
      type: "group",
      operator: "OR",
      children: [
        { type: "condition", field: "nomeCompleto", comparator: "ILIKE", value: `%${filters.search}%` },
        { type: "condition", field: "nomeGuerra", comparator: "ILIKE", value: `%${filters.search}%` },
        { type: "condition", field: "cpf", comparator: "ILIKE", value: `%${filters.search}%` },
        { type: "condition", field: "identidade", comparator: "ILIKE", value: `%${filters.search}%` },
      ],
    };
    
    // Se já temos outras condições, cria um AND entre elas e o grupo de busca
    if (conditions.length > 0) {
      return {
        type: "group",
        operator: "AND",
        children: [...conditions, searchGroup],
      };
    } else {
      return searchGroup;
    }
  }

  // Se não há filtros, retorna um grupo vazio (AND)
  return {
    type: "group",
    operator: "AND",
    children: conditions,
  };
}
