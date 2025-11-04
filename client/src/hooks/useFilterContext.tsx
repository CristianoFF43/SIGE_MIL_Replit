import { createContext, useContext, useState, ReactNode } from "react";
import type { FilterTree } from "@shared/schema";

interface FilterContextType {
  filterTree: FilterTree | null;
  setFilterTree: (tree: FilterTree | null) => void;
  activeFilterId: string | null;
  setActiveFilterId: (id: string | null) => void;
  clearFilter: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filterTree, setFilterTree] = useState<FilterTree | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const clearFilter = () => {
    setFilterTree(null);
    setActiveFilterId(null);
  };

  return (
    <FilterContext.Provider
      value={{
        filterTree,
        setFilterTree,
        activeFilterId,
        setActiveFilterId,
        clearFilter,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilterContext must be used within FilterProvider");
  }
  return context;
}
