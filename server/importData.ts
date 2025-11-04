import { db } from "./db";
import { militaryPersonnel, users } from "@shared/schema";

// Initial data from Google Sheets - parsed from the spreadsheet
const initialData = [
  { ord: 1, postoGraduacao: "Ten Cel", armaQuadroServico: "Inf", nomeCompleto: "DAISLAN MONTENÁRIO DE AGUIAR", nomeGuerra: "DAISLAN", companhia: "EM", secaoFracao: "Comando", funcao: "Cmt", curso: "FE", situacao: "Pronto", missaoOp: "FORPRON", identidade: "130574841" },
  { ord: 2, postoGraduacao: "Maj", armaQuadroServico: "Inf", nomeCompleto: "WILIAM VELOZO SAMUEL JUNIOR", nomeGuerra: "WILIAM VELOZO", companhia: "EM", secaoFracao: "Comando", funcao: "Sub Cmt", situacao: "Pronto", identidade: "131487043" },
  { ord: 3, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "RIBERTO LEITE DE FREITAS", nomeGuerra: "RIBERTO", companhia: "EM", secaoFracao: "S4", funcao: "Chefe Sç", situacao: "Pronto", identidade: "1140076744" },
  { ord: 4, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "LUCAS DE SOUSA GONÇALVES BIENIEK", nomeGuerra: "LUCAS", companhia: "EM", secaoFracao: "S3", funcao: "Chefe Sç", situacao: "Pronto", missaoOp: "FORPRON", identidade: "217887942" },
  { ord: 5, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "GUILHERME WINSTON DA SILVEIRA RODRIGUES", nomeGuerra: "WINSTON", companhia: "3ª CIA", secaoFracao: "Seç Cmdo", funcao: "Cmt Cia/S2", curso: "COS", situacao: "Pronto", identidade: "938483344" },
  { ord: 6, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "YURI GUSTAVO DO NASCIMENTO", nomeGuerra: "YURI NASCIMENTO", companhia: "1ª CIA", secaoFracao: "Seç Cmdo", funcao: "Cmt Cia", curso: "COS", situacao: "Pronto", missaoOp: "FORPRON", identidade: "1200397550", endereco: "RUA AJURICABA", bairro: "CENTRO", cidade: "BOA VISTA-RR", telefoneContato1: "(21)96471-7885", telefoneContato2: "(21)972920405" },
  { ord: 7, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "LUCAS ASSIS FAGUNDES", nomeGuerra: "LUCAS ASSIS", companhia: "CEF", curso: "COS", situacao: "Transferido", identidade: "300359650" },
  { ord: 8, postoGraduacao: "Cap", armaQuadroServico: "Int", nomeCompleto: "JOÃO PEDRO DA SILVA MELIANO", nomeGuerra: "MELIANO", companhia: "B ADM", secaoFracao: "Fiscalização Adm", funcao: "Fiscal Adm", situacao: "Pronto", identidade: "203995774" },
  { ord: 9, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "BRÊNDON LUÍS BRAGA DUTRA", nomeGuerra: "DUTRA", companhia: "CEF", secaoFracao: "3º PEF", funcao: "Cmt PEF", curso: "COS", situacao: "Destacado", identidade: "940125149" },
  { ord: 10, postoGraduacao: "Cap", armaQuadroServico: "Inf", nomeCompleto: "DAVYD DO MONTE BASSI", nomeGuerra: "BASSI", companhia: "3ª CIA", secaoFracao: "Seç Cmdo", funcao: "Cmt Cia", situacao: "À Disposição", identidade: "1200567954" },
  { ord: 11, postoGraduacao: "1º Ten", armaQuadroServico: "Inf", nomeCompleto: "PHILIPE DELMIRO DOS SANTOS", nomeGuerra: "DELMIRO", companhia: "2ª CIA", secaoFracao: "Seç Cmdo", funcao: "Cmt Cia", situacao: "Pronto", identidade: "204015077" },
  { ord: 12, postoGraduacao: "1º Ten", armaQuadroServico: "Inf", nomeCompleto: "MATHEUS MATOS ESTRELA", nomeGuerra: "MATHEUS MATOS", companhia: "CCAP", situacao: "Transferido", identidade: "1200057154" },
  { ord: 13, postoGraduacao: "1º Ten", armaQuadroServico: "Inf", nomeCompleto: "DANILO SILVA FRANCO", nomeGuerra: "DANILO FRANCO", companhia: "CEF", secaoFracao: "4º PEF", funcao: "Cmt PEF", situacao: "Destacado", identidade: "1202066054" },
  { ord: 14, postoGraduacao: "1º Ten", armaQuadroServico: "Tmpr", nomeCompleto: "LUCAS MONTEIRO DA SILVA", nomeGuerra: "L MONTEIRO", companhia: "B ADM", secaoFracao: "Tesouraria", funcao: "Chefe Sç", situacao: "Pronto", identidade: "1207103076" },
  { ord: 15, postoGraduacao: "1º Ten", armaQuadroServico: "QAO-Mnt Com", nomeCompleto: "AGEU DE CASTRO BARRÊTO NETO", nomeGuerra: "AGEU", companhia: "EM", secaoFracao: "S1", funcao: "Chefe Sç", situacao: "Pronto", identidade: "195028337" },
];

export async function importInitialData() {
  try {
    console.log("Starting initial data import...");
    
    // Check if data already exists
    const existingData = await db.select().from(militaryPersonnel).limit(1);
    if (existingData.length > 0) {
      console.log("Data already exists. Skipping import.");
      return;
    }

    // Insert initial data
    for (const person of initialData) {
      await db.insert(militaryPersonnel).values(person);
    }

    console.log(`Successfully imported ${initialData.length} military personnel records.`);
    
    // Create an initial administrator user if none exists
    // This is for testing purposes - in production, admin should be set via secure process
    const adminCheck = await db.select().from(users).limit(1);
    if (adminCheck.length === 0) {
      console.log("Creating initial administrator account placeholder...");
      console.log("First user to login will need to be promoted to administrator manually via database.");
    }
  } catch (error) {
    console.error("Error importing initial data:", error);
    throw error;
  }
}
