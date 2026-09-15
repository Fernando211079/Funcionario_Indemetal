import { exigirLogin, sair } from './auth.js';
import { getPerfilAtual } from './access.js';
export async function protegerPagina(opcoes={}){
  const user=await exigirLogin(opcoes.destino || location.pathname.split('/').pop() || 'acesso.html');
  const perfil=await getPerfilAtual();
  if(opcoes.perfis?.length && (!perfil?.ativo || !opcoes.perfis.includes(perfil.perfil))){ window.location.href='acesso.html?erro=sem_permissao'; return null; }
  const bind=()=>{ const email=document.querySelector('[data-user-email]'); if(email) email.textContent=user?.email||'Usuário'; const p=document.querySelector('[data-user-role]'); if(p) p.textContent=perfil?.perfil||'Sem perfil'; const s=document.querySelector('[data-user-sector]'); if(s) s.textContent=perfil?.setor||'Todos'; document.querySelectorAll('[data-logout]').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',async()=>{await sair();location.href='login.html'});}); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
  return {user,perfil};
}
protegerPagina();
