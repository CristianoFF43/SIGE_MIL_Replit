import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getRankCategory(rank: string): string {
  const oficiais = ["Ten Cel", "Maj", "Cap", "1º Ten", "2º Ten"];
  const subtenentes = ["S Ten"];
  const sargentos = ["1º Sgt", "2º Sgt", "3º Sgt"];
  const cabos = ["Cb"];
  const soldados = ["Sd 1ª Cl", "Sd 2ª Cl"];

  if (oficiais.includes(rank)) return "Oficiais";
  if (subtenentes.includes(rank)) return "Subtenentes";
  if (sargentos.includes(rank)) return "Sargentos";
  if (cabos.includes(rank)) return "Cabos";
  if (soldados.includes(rank)) return "Soldados";
  return "Outros";
}

export function getStatusVariant(status: string | null | undefined): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "secondary";
  
  const prontoStates = ["Pronto", "Apto recom."];
  const warningStates = ["Férias", "Licença", "Desc Férias", "Instalação"];
  const infoStates = ["Destacado", "À Disposição", "CHQAO"];
  const dangerStates = ["Transferido", "Preso Disp Jus", "Reint. Jud."];

  if (prontoStates.includes(status)) return "default";
  if (warningStates.includes(status)) return "outline";
  if (infoStates.includes(status)) return "secondary";
  if (dangerStates.includes(status)) return "destructive";
  
  return "secondary";
}
