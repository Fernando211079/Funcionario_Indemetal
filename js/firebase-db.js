import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, runTransaction, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { getPerfilAtual, podeVerTodos, setorPermitido, ehGerenteProducao } from "./access.js";
const COLLECTION="funcionarios", CP_COLLECTION="comunicacoes_pessoal", STORAGE_KEY="funcionariosSerigrafiaIndemetal";
let db=null,auth=null,app=null;
export function initFirebase(){if(!app)app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);if(!db)db=getFirestore(app);if(!auth)auth=getAuth(app);if(!firebaseConfig?.apiKey||firebaseConfig.apiKey==="SUA_API_KEY")throw new Error("Configure js/firebase-config.js com os dados do seu projeto Firebase.");return db;}
export function obterAuth(){initFirebase();return auth;}
export async function aguardarLogin(){initFirebase();if(auth.currentUser)return auth.currentUser;return new Promise((resolve,reject)=>{let done=false;const unsub=onAuthStateChanged(auth,u=>{if(done)return;done=true;unsub();if(u)resolve(u);else reject(new Error("Sessão não encontrada. Faça login para continuar."));},reject)});}
async function banco(){await aguardarLogin();return db;}
async function perfil(){await banco();return getPerfilAtual();}
function filtrarSetor(lista,p){return podeVerTodos(p)?lista:lista.filter(x=>(x.setorTrabalho||x.setor||"")===p.setor);}
export async function listarFuncionarios(){
  const b=await banco(),p=await perfil();
  if(podeVerTodos(p)){
    const s=await getDocs(query(collection(b,COLLECTION)));
    return s.docs.map(d=>({id:d.id,...d.data()}));
  }
  // Gerente de produção: vê todos os funcionários exceto os do setor Administração
  if(ehGerenteProducao(p)){
    const s=await getDocs(query(collection(b,COLLECTION)));
    return s.docs.map(d=>({id:d.id,...d.data()})).filter(f=>(f.setorTrabalho||f.setor||'')!=='Administração');
  }
  if(!p?.setor) return [];
  // Compatibilidade com cadastros antigos: a V5 podia gravar o setor no campo "setor",
  // enquanto a V6 usa "setorTrabalho". As duas consultas continuam limitadas ao setor do gestor.
  const [s1,s2]=await Promise.all([
    getDocs(query(collection(b,COLLECTION),where("setorTrabalho","==",p.setor))),
    getDocs(query(collection(b,COLLECTION),where("setor","==",p.setor)))
  ]);
  const mapa=new Map();
  for(const s of [s1,s2]) for(const d of s.docs) mapa.set(d.id,{id:d.id,...d.data()});
  return [...mapa.values()];
}
export async function obterFuncionario(id){if(!id)return null;const b=await banco(),p=await perfil();const s=await getDoc(doc(b,COLLECTION,id));if(!s.exists())return null;const f={id:s.id,...s.data()};if(podeVerTodos(p))return f;if(ehGerenteProducao(p))return (f.setorTrabalho||f.setor||'')!=='Administração'?f:null;return setorPermitido(p,f.setorTrabalho||f.setor)?f:null;}
function normalizarSetor(dados,p){const setor=(dados.setorTrabalho||dados.setor||"").trim();if(p.perfil==='gestor')return p.setor;if(!setor)throw new Error("Selecione um setor para o funcionário.");return setor;}
export async function adicionarFuncionario(dados){const b=await banco(),p=await perfil();const setor=normalizarSetor(dados,p);const r=await addDoc(collection(b,COLLECTION),{...dados,setorTrabalho:setor,setorId:setor,criadoPor:obterAuth().currentUser.uid,atualizadoEm:new Date().toISOString()});return r.id;}
export async function atualizarFuncionario(id,dados){if(!id)throw new Error("Identificador do funcionário não informado.");const b=await banco(),p=await perfil();const atual=await obterFuncionario(id);if(!atual)throw new Error("Funcionário não encontrado ou sem permissão.");const setor=p.perfil==='gestor'?p.setor:normalizarSetor(dados,p);await updateDoc(doc(b,COLLECTION,id),{...dados,setorTrabalho:setor,setorId:setor,atualizadoEm:new Date().toISOString()});}
export async function excluirFuncionario(id){if(!id)throw new Error("Identificador do funcionário não informado.");const b=await banco();if(!await obterFuncionario(id))throw new Error("Funcionário não encontrado ou sem permissão.");await deleteDoc(doc(b,COLLECTION,id));}
export async function proximoNumeroCP(){const b=await banco(),ref=doc(b,"configuracoes","numeracao_cp");return runTransaction(b,async tx=>{const s=await tx.get(ref);const atual=s.exists()?Number(s.data().ultimoNumero||0):0;const proximo=atual+1;tx.set(ref,{ultimoNumero:proximo,atualizadoEm:new Date().toISOString()},{merge:true});return String(proximo).padStart(4,'0')});}
function normalizarCPSetor(dados,p){const setor=(dados.setor||dados.setorTrabalho||"").trim();if(p.perfil==='gestor')return p.setor;if(!setor)throw new Error("Informe o setor da CP.");return setor;}
export async function salvarCP(dados){
  const b=await banco(),p=await perfil();
  if(!['gestor','administrador'].includes(p?.perfil)) throw new Error("Somente Gestor ou Administrador pode criar uma CP.");
  const setor=normalizarCPSetor(dados,p);
  if(p.perfil==='gestor' && dados.funcionarios?.some(f=>(f.setor||setor)!==setor)) throw new Error("Há funcionário de outro setor na autorização.");
  const numero=dados.numero||await proximoNumeroCP();
  const uid=obterAuth().currentUser.uid;
  const agora=new Date().toISOString();
  const diretoRH = setor === 'Administração';
  const historico=[{acao:diretoRH?'CP criada e enviada diretamente ao RH':'CP criada e enviada ao Gerente de Produção',status:diretoRH?'Pendente RH':'Pendente Gerente',por:uid,perfil:p.perfil,nome:p.nome||p.email||'',data:agora}];
  const r=await addDoc(collection(b,CP_COLLECTION),{
    ...dados, setor, setorId:setor, numero, criadoPor:uid, criadoEm:agora, atualizadoEm:agora,
    fluxoGerente:!diretoRH, statusCP:diretoRH?'Pendente RH':'Pendente Gerente', etapaAtual:diretoRH?'RH':'GERENTE',
    statusGerente:diretoRH?'Dispensado':'Pendente', statusRH:'Pendente', statusEnvio:diretoRH?'Enviada ao RH':'Aguardando Gerente de Produção',
    historico
  });
  return r.id;
}
export async function atualizarCP(id,dados){
  const b=await banco(),p=await perfil();
  const atual=await obterCP(id);
  if(!atual) throw new Error("CP não encontrada ou sem permissão.");
  const setor=p.perfil==='gestor'?p.setor:(dados.setor||atual.setor);
  await updateDoc(doc(b,CP_COLLECTION,id),{...dados,setor,setorId:setor,atualizadoEm:new Date().toISOString()});
}
function nomeStatus(acao){return acao==='Aprovada'?'Aprovada pelo Gerente de Produção':acao==='Recusada'?'Recusada pelo Gerente de Produção':acao;}
// CPs criadas antes da V6.1 não possuem o campo statusGerente. Como a fila do Gerente
// é uma consulta por igualdade, elas nunca chegam até ele e ficariam travadas para sempre.
// Essas CPs são tratadas como legado e seguem direto para o aceite do RH.
export function cpLegada(cp){ return !!cp && !Object.prototype.hasOwnProperty.call(cp,'statusGerente'); }
export async function alterarStatusGerente(id,status,observacao=""){
  const b=await banco(),p=await perfil();
  if(!['administrador','gerente_producao'].includes(p?.perfil)) throw new Error("Somente o Gerente de Produção ou Administrador pode liberar a CP.");
  const ref=doc(b,CP_COLLECTION,id); const snap=await getDoc(ref); if(!snap.exists()) throw new Error("CP não encontrada.");
  const atual={id:snap.id,...snap.data()};
  if(atual.setor==='Administração') throw new Error("CPs da Administração não passam pelo Gerente de Produção.");
  const statusGerenteAtual=atual.statusGerente || (atual.setor==='Administração'?'Dispensado':'Pendente');
  if(statusGerenteAtual!=='Pendente') throw new Error("Esta CP já foi analisada pelo Gerente de Produção.");
  if(!['Aprovada','Recusada'].includes(status)) throw new Error("Decisão do gerente inválida.");
  const agora=new Date().toISOString();
  const aprovado=status==='Aprovada';
  const entrada={acao:nomeStatus(status),status:aprovado?'Pendente RH':'Recusada pelo Gerente',por:obterAuth().currentUser.uid,nome:p.nome||p.email||'Gerente de Produção',perfil:p.perfil,observacao:observacao||'',data:agora};
  const alteracoes={statusGerente:status,statusCP:aprovado?'Pendente RH':'Recusada pelo Gerente',etapaAtual:aprovado?'RH':'FINAL',statusEnvio:aprovado?'Liberada pelo Gerente — aguardando RH':'Recusada pelo Gerente',gerenteObservacao:observacao||'',gerenteUid:obterAuth().currentUser.uid,gerenteEm:agora,atualizadoEm:agora};
  await updateDoc(ref,{...alteracoes,historico:arrayUnion(entrada)});
  // Devolve a CP já atualizada. Reler o documento aqui provocava erro de permissão,
  // porque a CP acabou de sair da fila "Pendente" do Gerente.
  return {...atual,...alteracoes,historico:[...(atual.historico||[]),entrada]};
}
export async function alterarStatusRH(id,status,observacao=""){
  const b=await banco(),p=await perfil();
  if(!['administrador','rh'].includes(p?.perfil)) throw new Error("Somente RH ou Administrador pode dar o aceite final da CP.");
  const ref=doc(b,CP_COLLECTION,id); const snap=await getDoc(ref); if(!snap.exists()) throw new Error("CP não encontrada.");
  const atual={id:snap.id,...snap.data()};
  const diretoRH=atual.setor==='Administração' || cpLegada(atual);
  if(!diretoRH && atual.statusGerente!=='Aprovada') throw new Error("Esta CP ainda não foi liberada pelo Gerente de Produção.");
  const permitidos=['Recebida','Aprovada','Recusada']; if(!permitidos.includes(status)) throw new Error("Status RH inválido.");
  if(status==='Recebida' && atual.statusRH==='Aprovada') throw new Error("Esta CP já recebeu o aceite do RH.");
  const agora=new Date().toISOString();
  const final= status==='Aprovada' || status==='Recusada';
  const entrada={acao:status==='Recebida'?'CP recebida pelo RH':status==='Aprovada'?'Aceite final do RH — CP aprovada': 'CP recusada pelo RH',status,por:obterAuth().currentUser.uid,nome:p.nome||p.email||'RH',perfil:p.perfil,observacao:observacao||'',data:agora};
  const alteracoes={statusRH:status,statusCP:status==='Aprovada'?'Aprovada pelo RH':status==='Recusada'?'Recusada pelo RH':'Recebida pelo RH',etapaAtual:final?'FINAL':'RH',statusEnvio:status==='Aprovada'?'Aceite do RH concluído':status==='Recusada'?'Recusada pelo RH':'Recebida pelo RH',observacaoRH:observacao||'',rhUid:obterAuth().currentUser.uid,atualizadoEm:agora,...(status==='Recebida'?{recebidaEm:agora}:{}),...(status==='Aprovada'?{aprovadaEm:agora}:{}),...(status==='Recusada'?{recusadaEm:agora}:{})};
  await updateDoc(ref,{...alteracoes,historico:arrayUnion(entrada)});
  return {...atual,...alteracoes,historico:[...(atual.historico||[]),entrada]};
}
export async function adicionarObservacaoCP(id,texto){
  if(!id||!texto?.trim()) throw new Error("Informe o texto da observação.");
  const b=await banco(),p=await perfil();
  if(!['gestor','administrador','gerente_producao','rh'].includes(p?.perfil)) throw new Error("Sem permissão para adicionar observação.");
  const cp=await obterCP(id);
  if(!cp) throw new Error("CP não encontrada.");
  const agora=new Date().toISOString();
  const entrada={acao:'Observação',status:cp.statusCP||'',por:obterAuth().currentUser.uid,nome:p.nome||p.email||p.perfil,perfil:p.perfil,observacao:texto.trim(),data:agora};
  await updateDoc(doc(b,CP_COLLECTION,id),{historico:arrayUnion(entrada),atualizadoEm:agora});
  return entrada;
}
export async function listarHistoricoCP(id){
  const c=await obterCP(id);
  return c?.historico||[];
}
export async function obterCP(id){
  const b=await banco(),p=await perfil();
  const s=await getDoc(doc(b,CP_COLLECTION,id));
  if(!s.exists())return null;
  const c={id:s.id,...s.data()};
  // O Gerente de Produção não tem setor próprio: ele enxerga as CPs operacionais
  // que estão na fila dele ou que ele mesmo decidiu.
  if(ehGerenteProducao(p)) return c.setor==='Administração'?null:c;
  return setorPermitido(p,c.setor)?c:null;
}
function ordenarCPs(lista){
  return [...lista].sort((a,b)=>String(b.criadoEm||b.atualizadoEm||'').localeCompare(String(a.criadoEm||a.atualizadoEm||'')));
}
function mesclarCPs(...grupos){
  const mapa=new Map();
  for(const grupo of grupos) for(const c of grupo||[]) mapa.set(c.id,c);
  return [...mapa.values()];
}
function consultasCPs(b,p){
  if(ehGerenteProducao(p)){
    // 1) Fila do gerente. 2) Histórico das CPs que ele decidiu (opcional: depende da
    // regra nova publicada; se falhar, a fila continua funcionando normalmente).
    return [
      {q:query(collection(b,CP_COLLECTION),where("statusGerente","==","Pendente")),opcional:false},
      {q:query(collection(b,CP_COLLECTION),where("gerenteUid","==",obterAuth().currentUser.uid)),opcional:true}
    ];
  }
  if(podeVerTodos(p)) return [{q:query(collection(b,CP_COLLECTION)),opcional:false}];
  if(!p?.perfil) throw new Error('Seu usuário não tem um Perfil de Acesso cadastrado. Peça ao administrador para criar o acesso em admin.html.');
  if(!p?.setor) throw new Error(`O usuário "${p.nome||p.email||p.perfil}" está sem setor definido no Perfil de Acesso. Peça ao administrador para preencher o setor em admin.html.`);
  return [{q:query(collection(b,CP_COLLECTION),where("setor","==",p.setor)),opcional:false}];
}
export function descreverErroFirestore(err){
  if(!err) return '';
  const codigo=String(err.code||'');
  if(codigo.includes('permission-denied')) return 'Permissão negada pelas regras do Firestore. Publique o arquivo firestore.rules atualizado no Console do Firebase (Firestore > Regras > Publicar).';
  if(codigo.includes('failed-precondition')) return 'O Firestore precisa criar um índice para esta consulta. Abra o console do navegador (F12) e clique no link "create index" que aparece no erro.';
  if(codigo.includes('unauthenticated')) return 'Sessão expirada. Faça login novamente.';
  return err.message||String(err);
}
export async function listarCPs(){
  const b=await banco(),p=await perfil();
  const consultas=consultasCPs(b,p);
  const resultados=await Promise.all(consultas.map(async c=>{
    try{ const s=await getDocs(c.q); return s.docs.map(d=>({id:d.id,...d.data()})); }
    catch(err){ if(c.opcional){ console.warn('Consulta opcional de CPs ignorada:',err); return []; } throw err; }
  }));
  let lista=mesclarCPs(...resultados);
  if(ehGerenteProducao(p)) lista=lista.filter(c=>c.setor!=="Administração");
  return ordenarCPs(lista);
}
export async function listarUltimasCPs(qtd=30){
  const lista=await listarCPs();
  return lista.slice(0,qtd);
}
export async function observarCPs(callback,qtd=50){
  const b=await banco(),p=await perfil();
  const consultas=consultasCPs(b,p);
  const buffers=consultas.map(()=>[]);
  const recebido=consultas.map(()=>false);
  const falhas=consultas.map(()=>null);
  const emitir=()=>{
    // Renderiza assim que QUALQUER consulta responder. Antes exigia todas, então uma
    // consulta negada pelas regras deixava o painel permanentemente vazio.
    if(!recebido.some(Boolean)) return;
    let lista=mesclarCPs(...buffers);
    if(ehGerenteProducao(p)) lista=lista.filter(c=>c.setor!=="Administração");
    const obrigatoriasComFalha=consultas.map((c,i)=>(!c.opcional&&falhas[i])?falhas[i]:null).filter(Boolean);
    const erro=obrigatoriasComFalha.length?obrigatoriasComFalha[0]:null;
    callback(ordenarCPs(lista).slice(0,qtd),null,erro);
  };
  const cancelar=consultas.map((c,i)=>onSnapshot(c.q,s=>{
    buffers[i]=s.docs.map(d=>({id:d.id,...d.data()}));
    falhas[i]=null; recebido[i]=true; emitir();
  },err=>{
    console.error(`Falha na consulta de CPs #${i+1}${c.opcional?' (opcional)':''}:`,err);
    buffers[i]=[]; falhas[i]=err; recebido[i]=true; emitir();
  }));
  return ()=>cancelar.forEach(fn=>fn());
}
export async function migrarLocalStorageSeNecessario(){const bruto=localStorage.getItem(STORAGE_KEY);if(!bruto)return;let lista;try{lista=JSON.parse(bruto)}catch{localStorage.removeItem(STORAGE_KEY);return}if(!Array.isArray(lista)||!lista.length){localStorage.removeItem(STORAGE_KEY);return}const existentes=await listarFuncionarios();if(existentes.length){localStorage.removeItem(STORAGE_KEY);return}for(const funcionario of lista)await adicionarFuncionario(funcionario);localStorage.removeItem(STORAGE_KEY);}
export async function iniciarApp(){initFirebase();await aguardarLogin();await migrarLocalStorageSeNecessario();}
