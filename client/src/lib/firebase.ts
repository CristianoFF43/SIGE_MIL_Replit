import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signInWithGoogle() {
  try {
    console.log("[FIREBASE] Iniciando login com Google...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("[FIREBASE] Login com Google bem-sucedido! User:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("[FIREBASE] ERRO no login com Google:");
    console.error("[FIREBASE] Error code:", error.code);
    console.error("[FIREBASE] Error message:", error.message);
    
    // Mensagens de erro mais claras
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup bloqueado. Por favor, permita popups para este site.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelado.");
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error("Domínio não autorizado. Configure o domínio no Firebase Console.");
    }
    
    throw new Error(error.message || "Falha ao fazer login com Google");
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    console.log("[FIREBASE] Iniciando login com email:", email);
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("[FIREBASE] Login com email bem-sucedido! User:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("[FIREBASE] ERRO no login com email:");
    console.error("[FIREBASE] Error code:", error.code);
    console.error("[FIREBASE] Error message:", error.message);

    // Códigos de erro atualizados do Firebase Auth
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      throw new Error("Email ou senha incorretos");
    } else if (error.code === 'auth/wrong-password') {
      throw new Error("Email ou senha incorretos");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Email inválido");
    } else if (error.code === 'auth/user-disabled') {
      throw new Error("Esta conta foi desativada");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Muitas tentativas. Tente novamente mais tarde");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Erro de conexão. Verifique sua internet");
    }

    throw new Error(error.message || "Falha ao fazer login");
  }
}

export async function registerWithEmail(email: string, password: string) {
  try {
    console.log("[FIREBASE] Criando conta com email:", email);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("[FIREBASE] Conta criada com sucesso! User:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("[FIREBASE] ERRO ao criar conta:");
    console.error("[FIREBASE] Error code:", error.code);
    console.error("[FIREBASE] Error message:", error.message);

    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Este email já está em uso");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("Senha muito fraca (mínimo 6 caracteres)");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Email inválido");
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("Cadastro por email não está habilitado. Contate o administrador");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Erro de conexão. Verifique sua internet");
    }

    throw new Error(error.message || "Falha ao criar conta");
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error("Erro ao fazer logout:", error);
    throw new Error(error.message || "Falha ao fazer logout");
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
