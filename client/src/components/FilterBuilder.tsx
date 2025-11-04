import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, X, ChevronDown } from "lucide-react";
import { COMPANIES, RANKS, STATUSES } from "@shared/schema";
import type { FilterTree, FilterGroup, FilterCondition, CustomFieldDefinition } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Internal structure for easier UI management
interface InternalFilterGroup {
  operator: "AND" | "OR";
  conditions: FilterCondition[];
  groups: InternalFilterGroup[];
}

// Convert from schema FilterGroup to internal structure
function toInternal(group: FilterGroup): InternalFilterGroup {
  const conditions: FilterCondition[] = [];
  const groups: InternalFilterGroup[] = [];
  
  group.children.forEach(child => {
    if (child.type === "condition") {
      conditions.push(child);
    } else {
      groups.push(toInternal(child));
    }
  });
  
  return { operator: group.operator, conditions, groups };
}

// Convert from internal structure to schema FilterGroup
function toSchema(internal: InternalFilterGroup): FilterGroup {
  const children: (FilterCondition | FilterGroup)[] = [
    ...internal.conditions,
    ...internal.groups.map(toSchema)
  ];
  
  return {
    type: "group",
    operator: internal.operator,
    children
  };
}

const BASE_FIELD_OPTIONS = [
  { value: "companhia", label: "Companhia" },
  { value: "postoGraduacao", label: "Posto/Graduação" },
  { value: "secaoFracao", label: "SEÇ/FRAÇÃO" },
  { value: "situacao", label: "Situação" },
  { value: "missaoOp", label: "Missão" },
  { value: "nomeCompleto", label: "Nome Completo" },
  { value: "nomeGuerra", label: "Nome de Guerra" },
  { value: "cpf", label: "CPF" },
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "Email" },
];

const COMPARATOR_OPTIONS = [
  { value: "=", label: "Igual a (=)" },
  { value: "!=", label: "Diferente de (≠)" },
  { value: "IN", label: "Em lista" },
  { value: "NOT IN", label: "Não em lista" },
  { value: "LIKE", label: "Contém (sensível)" },
  { value: "ILIKE", label: "Contém (insensível)" },
];

const FIELD_VALUES: Record<string, string[]> = {
  companhia: [...COMPANIES],
  postoGraduacao: [...RANKS],
  situacao: [...STATUSES],
};

interface FilterBuilderProps {
  value: FilterTree | null;
  onChange: (tree: FilterTree) => void;
  onClose?: () => void;
}

function MultiSelectValue({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleValue = (opt: string) => {
    const newValue = value.includes(opt)
      ? value.filter((v) => v !== opt)
      : [...value, opt];
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 min-w-[200px] justify-between"
          data-testid="button-multiselect"
        >
          <span className="truncate">
            {value.length === 0
              ? "Selecione valores"
              : value.length === 1
              ? value[0]
              : `${value.length} selecionados`}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-3">
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <Checkbox
                checked={value.includes(opt)}
                onCheckedChange={() => toggleValue(opt)}
                data-testid={`checkbox-${opt}`}
              />
              <label className="text-sm cursor-pointer" onClick={() => toggleValue(opt)}>
                {opt}
              </label>
            </div>
          ))}
        </div>
        {value.length > 0 && (
          <div className="mt-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="w-full"
              data-testid="button-clear-selection"
            >
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ConditionRow({
  condition,
  onChange,
  onDelete,
  fieldOptions,
}: {
  condition: FilterCondition;
  onChange: (c: FilterCondition) => void;
  onDelete: () => void;
  fieldOptions: Array<{ value: string; label: string }>;
}) {
  const fieldValueOptions = FIELD_VALUES[condition.field];
  const supportsMultiple = ["IN", "NOT IN"].includes(condition.comparator);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="filter-condition-row">
      <Select value={condition.field} onValueChange={(field) => onChange({ ...condition, field: field as FilterCondition["field"] })}>
        <SelectTrigger className="w-[160px]" data-testid="select-field">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fieldOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.comparator}
        onValueChange={(comparator) => onChange({ ...condition, comparator: comparator as FilterCondition["comparator"] })}
      >
        <SelectTrigger className="w-[160px]" data-testid="select-comparator">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARATOR_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {fieldValueOptions ? (
        supportsMultiple ? (
          <MultiSelectValue
            options={fieldValueOptions}
            value={Array.isArray(condition.value) ? condition.value : []}
            onChange={(val) => onChange({ ...condition, value: val })}
          />
        ) : (
          <Select
            value={typeof condition.value === "string" ? condition.value : ""}
            onValueChange={(value) => onChange({ ...condition, value })}
          >
            <SelectTrigger className="flex-1 min-w-[200px]" data-testid="select-value">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldValueOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <Input
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Valor"
          className="flex-1 min-w-[200px]"
          data-testid="input-value"
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        data-testid="button-delete-condition"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function GroupBuilder({
  group,
  onChange,
  onDelete,
  depth = 0,
  fieldOptions,
}: {
  group: InternalFilterGroup;
  onChange: (g: InternalFilterGroup) => void;
  onDelete?: () => void;
  depth?: number;
  fieldOptions: Array<{ value: string; label: string }>;
}) {
  const addCondition = () => {
    onChange({
      ...group,
      conditions: [
        ...group.conditions,
        { type: "condition", field: "companhia", comparator: "=", value: "" },
      ],
    });
  };

  const addGroup = () => {
    onChange({
      ...group,
      groups: [
        ...(group.groups || []),
        { operator: "AND", conditions: [], groups: [] },
      ],
    });
  };

  const updateCondition = (index: number, condition: FilterCondition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = condition;
    onChange({ ...group, conditions: newConditions });
  };

  const deleteCondition = (index: number) => {
    onChange({
      ...group,
      conditions: group.conditions.filter((_: FilterCondition, i: number) => i !== index),
    });
  };

  const updateGroup = (index: number, updatedGroup: InternalFilterGroup) => {
    const newGroups = [...(group.groups || [])];
    newGroups[index] = updatedGroup;
    onChange({ ...group, groups: newGroups });
  };

  const deleteGroup = (index: number) => {
    onChange({
      ...group,
      groups: (group.groups || []).filter((_: InternalFilterGroup, i: number) => i !== index),
    });
  };

  return (
    <Card className={`p-4 space-y-3 ${depth > 0 ? "ml-4 border-l-4 border-primary/30" : ""}`}>
      <div className="flex items-center gap-2">
        <Select
          value={group.operator}
          onValueChange={(operator: "AND" | "OR") => onChange({ ...group, operator })}
        >
          <SelectTrigger className="w-[120px]" data-testid="select-operator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">E (AND)</SelectItem>
            <SelectItem value="OR">OU (OR)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {depth > 0 && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} data-testid="button-delete-group">
            <X className="h-4 w-4 mr-1" />
            Remover Grupo
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {group.conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            onChange={(c) => updateCondition(index, c)}
            onDelete={() => deleteCondition(index)}
            fieldOptions={fieldOptions}
          />
        ))}
      </div>

      <div className="space-y-2">
        {(group.groups || []).map((subGroup, index) => (
          <GroupBuilder
            key={index}
            group={subGroup}
            onChange={(g) => updateGroup(index, g)}
            onDelete={() => deleteGroup(index)}
            depth={depth + 1}
            fieldOptions={fieldOptions}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addCondition} data-testid="button-add-condition">
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Condição
        </Button>
        <Button variant="outline" size="sm" onClick={addGroup} data-testid="button-add-group">
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Grupo
        </Button>
      </div>
    </Card>
  );
}

export function FilterBuilder({ value, onChange, onClose }: FilterBuilderProps) {
  const { isAuthenticated } = useAuth();
  
  const { data: customFields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields"],
    enabled: isAuthenticated,
  });

  const FIELD_OPTIONS = [
    ...BASE_FIELD_OPTIONS,
    ...customFields.map(field => ({
      value: `customFields.${field.name}`,
      label: field.label
    }))
  ];

  const emptyInternal: InternalFilterGroup = {
    operator: "AND",
    conditions: [],
    groups: [],
  };
  
  const initialTree: InternalFilterGroup = value ? toInternal(value) : emptyInternal;

  const [localTree, setLocalTree] = useState<InternalFilterGroup>(initialTree);

  // Sincronizar localTree quando value prop mudar (ex: após clearFilter())
  useEffect(() => {
    setLocalTree(value ? toInternal(value) : emptyInternal);
  }, [value]);

  const handleApply = () => {
    onChange(toSchema(localTree));
    onClose?.();
  };

  return (
    <div className="space-y-4" data-testid="filter-builder">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtro Avançado</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <GroupBuilder group={localTree} onChange={setLocalTree} fieldOptions={FIELD_OPTIONS} />

      <div className="flex gap-2 pt-2">
        <Button onClick={handleApply} data-testid="button-apply-filter">
          Aplicar Filtro
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
