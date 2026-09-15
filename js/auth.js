import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
let auth = null;
export function initAuth(){ const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig); auth=getAuth(app); return auth; }
export function getAuthInstance(){return auth||initAuth();}
export function usuarioAtual(){return getAuthInstance().currentUser;}
export async function entrar(email,senha){return signInWithEmailAndPassword(getAuthInstance(),email,senha);}
export async function sair(){return signOut(getAuthInstance());}
export function observarSessao(callback){return onAuthStateChanged(getAuthInstance(),callback);}
export async function exigirLogin(destino="acesso.html"){
  const a=getAuthInstance();
  return new Promise((resolve,reject)=>{let done=false;const unsub=onAuthStateChanged(a,user=>{if(done)return;done=true;unsub();if(user)resolve(user);else{window.location.href=`login.html?redirect=${encodeURIComponent(destino)}`;}},reject);});
}
