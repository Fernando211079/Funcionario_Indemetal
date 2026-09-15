import { initFirebase, listarFuncionarios, proximoNumeroCP, salvarCP, atualizarCP } from "./firebase-db.js";

export async function prepararCP(){ initFirebase(); const funcionarios=await listarFuncionarios(); return {funcionarios:funcionarios.filter(f=>String(f.status||f.situacao||"Ativo").toLowerCase()!=="dispensado")}; }
export function preencherFuncionario(select, funcionario){ if(!funcionario)return; select.dataset.funcionarioId=funcionario.id||""; }
export async function novoNumero(){ initFirebase(); return proximoNumeroCP(); }
export async function persistirCP(dados){ initFirebase(); return salvarCP(dados); }
export async function marcarEnviada(id,email){ initFirebase(); return atualizarCP(id,{emailRH:email||"",ultimaNotificacaoEmailEm:new Date().toISOString()}); }
export function formatarDataBR(v){ if(!v)return ""; const [a,m,d]=v.split("-"); return d&&m&&a?`${d}/${m}/${a}`:v; }
// Retorna o rótulo de tipo exibido na coluna "Tipo" das listagens.
// Para CPs de ocorrência, lista as ações marcadas (Advertência, Suspensão, etc.).
// Para horas extras, retorna "Horas Extras".
export function labelTipoCP(c){
  if(!c) return '-';
  if(c.tipo !== 'ocorrencia') return 'Horas Extras';
  const a = c.acoes || {};
  const marcadas = [];
  if(a.advertir)  marcadas.push('Advertência');
  if(a.suspender) marcadas.push('Suspensão');
  if(a.dispensar) marcadas.push('Dispensa');
  if(a.ferias)    marcadas.push('Férias');
  if(a.demissao)  marcadas.push('Demissão');
  if(a.promocao)  marcadas.push('Promoção');
  return marcadas.length ? marcadas.join(' / ') : 'Ocorrência';
}
export function esc(v){return String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
// Bloco "Tipo de comunicação" da CP de ocorrência (Advertir/Suspender/Dispensar/Férias/
// Demissão/Promoção + detalhes). Centralizado aqui porque os painéis do Gerente, do RH e
// o histórico do Gestor montavam o documento por conta própria e omitiam estas seleções.
export function blocoAcoesCP(cp){
  const a=cp?.acoes||{};
  const marcadas=[["Advertir",a.advertir],["Suspender",a.suspender],["Dispensar",a.dispensar],["Férias",a.ferias],["Pedido de demissão",a.demissao],["Promoção",a.promocao]]
    .filter(x=>x[1]).map(x=>`<span class="check">&#9745; ${x[0]}</span>`).join(" ");
  const detalhes=[];
  if(a.suspender) detalhes.push(`Suspensão: ${esc(a.diasSuspensao||"-")} dia(s)${a.dataSuspensao?` &mdash; início em ${formatarDataBR(a.dataSuspensao)}`:""}`);
  if(a.ferias) detalhes.push(`Férias a partir de: ${formatarDataBR(a.dataFerias)||"-"}`);
  if(a.promocao||a.cargoA||a.cargoN) detalhes.push(`Cargo: de ${esc(a.cargoA||"-")} para ${esc(a.cargoN||"-")}`);
  return `<div class="section"><b>Tipo de comunicação:</b><br>${marcadas||"<i>Nenhuma opção marcada</i>"}${detalhes.length?`<br>${detalhes.join("<br>")}`:""}</div>`;
}
export function imprimirDocumento(titulo,html){
  const w=window.open("","_blank","width=1000,height=800"); if(!w){alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");return;}
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#111;font-size:12px}.doc{max-width:900px;margin:auto}.top{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:14px}.title{font-size:20px;font-weight:700}.section{border:1px solid #999;padding:10px;margin:10px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.label{font-weight:bold}.check{margin-right:12px}.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;margin-top:55px;text-align:center}.line{border-top:1px solid #222;padding-top:5px}@media print{body{margin:12mm}.no-print{display:none!important}}</style></head><body><div class="doc">${html}</div><script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script></body></html>`); w.document.close();
}
export function emailRH({email,subject,body,cpId}){
  const to=(email||"").trim(); const link=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href=link; return !!cpId;
}
