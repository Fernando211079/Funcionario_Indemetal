import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const SETORES_PADRAO = ["Serigrafia","Corte","Estamparia","Plotter","Embalagem","Comercial","Administração","Resina","Digital"];
export const BOOTSTRAP_ADMIN_UID = "LF9vKmmEY6S6qfIiMcuy3bVKI4g2";

function app(){ return getApps().length ? getApps()[0] : initializeApp(firebaseConfig); }
function db(){ return getFirestore(app()); }
function auth(){ return getAuth(app()); }

export async function getPerfilAtual(){
  const user = auth().currentUser;
  if(!user) return null;

  // O administrador principal é reconhecido diretamente pelo UID.
  // Isso evita que o primeiro acesso fique dependente de uma leitura do Firestore.
  if(user.uid === BOOTSTRAP_ADMIN_UID){
    return { uid:user.uid, email:user.email||"", nome:"Administrador principal", perfil:"administrador", setor:"Todos", ativo:true, bootstrap:true };
  }

  const snap = await getDoc(doc(db(), "usuarios", user.uid));
  if(snap.exists()) return { uid:user.uid, email:user.email||"", ...snap.data() };
  return { uid:user.uid, email:user.email||"", nome:user.email||"", perfil:"sem_perfil", setor:"", ativo:false };
}

export async function exigirPerfil(perfis=[]){
  const perfil = await getPerfilAtual();
  if(!perfil || !perfil.ativo || (perfis.length && !perfis.includes(perfil.perfil))){
    window.location.href = "acesso.html?erro=sem_permissao";
    throw new Error("Usuário sem permissão para esta área.");
  }
  return perfil;
}
export function ehGerenteProducao(perfil){ return perfil?.perfil === "gerente_producao"; }
export function podeVerTodos(perfil){ return perfil?.perfil === "administrador" || perfil?.perfil === "rh"; }
export function setorPermitido(perfil, setor){ return podeVerTodos(perfil) || (perfil?.perfil === "gestor" && perfil.setor === setor); }
export async function listarSetores(){
  const snap = await getDocs(collection(db(), "setores"));
  const dbSetores = snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.ativo !== false).sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));
  return dbSetores.length ? dbSetores : SETORES_PADRAO.map(nome=>({id:nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-"),nome,ativo:true}));
}
export async function salvarSetor(nome){
  const perfil=await exigirPerfil(["administrador"]); if(!perfil) return;
  const id=nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-");
  if(!id) throw new Error("Nome do setor inválido.");
  await setDoc(doc(db(),"setores",id),{nome:nome.trim(),ativo:true,atualizadoEm:new Date().toISOString()},{merge:true});
}
export async function listarPerfisUsuarios(){
  await exigirPerfil(["administrador"]);
  const snap=await getDocs(collection(db(),"usuarios"));
  return snap.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||"").localeCompare(b.nome||b.email||""));
}
export async function salvarPerfilUsuario(uid,dados){
  await exigirPerfil(["administrador"]);
  if(!uid) throw new Error("UID obrigatório.");
  await setDoc(doc(db(),"usuarios",uid),{...dados,uid,ativo:dados.ativo!==false,atualizadoEm:new Date().toISOString()},{merge:true});
}
export async function excluirPerfilUsuario(uid){
  await exigirPerfil(["administrador"]);
  if(uid===BOOTSTRAP_ADMIN_UID) throw new Error("O administrador principal não pode ser removido.");
  await deleteDoc(doc(db(),"usuarios",uid));
}
