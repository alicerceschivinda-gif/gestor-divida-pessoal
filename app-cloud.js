import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const KEY='gdp_v1';
const DATA_VERSION='realdata_2026_07_v1';
const cfg=window.FIREBASE_CONFIG||{};
const configured=cfg.apiKey&&cfg.apiKey!=='COLE_AQUI';
const badge=document.createElement('button');
badge.id='cloudStatus';
badge.textContent=configured?'Ligar à nuvem':'Modo local';
badge.style.cssText='position:fixed;right:14px;bottom:14px;z-index:20;border:0;border-radius:999px;padding:10px 14px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;background:#fff;color:#172033';
document.body.appendChild(badge);

const EMPTY={debt:{},plan:[],payments:[]};
const REAL_STATE={
  debt:{
    creditor:'DOMINGOS JOAO SASSI',
    debtor:'ANTONIO BARTOLOMEU ALICERCES CH EDUARDO',
    amount:18000000,
    start:'2026-03-03',
    desc:'Regularização de dívida pessoal',
    notes:'Pagamento inicial de 10.000.000 Kz em 03/03/2026; saldo de 8.000.000 Kz sujeito a plano de regularização.'
  },
  plan:[
    {no:1,date:'2026-04-03',amount:888889},
    {no:2,date:'2026-05-03',amount:888889},
    {no:3,date:'2026-06-03',amount:888889},
    {no:4,date:'2026-07-03',amount:888889},
    {no:5,date:'2026-08-03',amount:888889},
    {no:6,date:'2026-09-03',amount:888889},
    {no:7,date:'2026-10-03',amount:888889},
    {no:8,date:'2026-11-03',amount:888889},
    {no:9,date:'2026-12-03',amount:888888}
  ],
  payments:[
    {date:'2026-03-03',amount:10000000,installment:'Inicial',bank:'BAI',ref:'6963858447',fileName:'1_PRESTACAO_03_MARCO_Comprovativo.pdf',note:'Pagamento inicial',code:'GDP-20260303-001'},
    {date:'2026-04-03',amount:1000000,installment:1,bank:'Banco BIC',ref:'10636795',fileName:'2_PRESTACAO_03_ABRIL.pdf',note:'Pagamento da 1.ª prestação do plano',code:'GDP-20260403-002'},
    {date:'2026-05-04',amount:1000000,installment:2,bank:'BPC',ref:'28409484',fileName:'3_PRESTACAO_04_MAIO.pdf',note:'Pagamento da 2.ª prestação do plano',code:'GDP-20260504-003'}
  ]
};

const readLocal=()=>{try{return JSON.parse(localStorage.getItem(KEY)||JSON.stringify(EMPTY))}catch{return structuredClone(EMPTY)}};
const hasDebt=s=>Number(s?.debt?.amount||0)>0;
const timeout=(p,ms=8000)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('TIMEOUT')),ms))]);

function applyRealDataMigration(){
  if(localStorage.getItem('gdp_data_version')===DATA_VERSION)return false;
  localStorage.setItem(KEY,JSON.stringify(REAL_STATE));
  localStorage.setItem('gdp_data_version',DATA_VERSION);
  return true;
}

const migrated=applyRealDataMigration();
if(migrated&&!sessionStorage.getItem('gdp_realdata_reload')){
  sessionStorage.setItem('gdp_realdata_reload','1');
  location.reload();
}

if(configured){
 const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
 let uid=null,syncing=false,lastSnapshot=localStorage.getItem(KEY)||'';

 function mergeSafe(local,cloud){
   if(localStorage.getItem('gdp_data_version')===DATA_VERSION)return local;
   const merged={...cloud};
   if(hasDebt(local)&&!hasDebt(cloud))merged.debt=local.debt;
   if((local.plan?.length||0)>(cloud.plan?.length||0))merged.plan=local.plan;
   if((local.payments?.length||0)>(cloud.payments?.length||0))merged.payments=local.payments;
   return merged;
 }

 async function pushState(){
   if(!uid||syncing)return;
   syncing=true;
   try{
     const raw=localStorage.getItem(KEY)||JSON.stringify(EMPTY);
     const state=JSON.parse(raw);
     await timeout(setDoc(doc(db,'users',uid,'state','main'),{...state,updatedAt:serverTimestamp()}));
     lastSnapshot=raw;
     badge.textContent='Sincronizado';
   }finally{syncing=false}
 }

 async function initialSync(){
   const local=readLocal();
   const snap=await timeout(getDoc(doc(db,'users',uid,'state','main')));
   if(!snap.exists()){await pushState();return}
   const cloud=snap.data(); delete cloud.updatedAt;
   const merged=mergeSafe(local,cloud);
   const mergedRaw=JSON.stringify(merged),localRaw=JSON.stringify(local);
   if(mergedRaw!==localRaw){
     localStorage.setItem(KEY,mergedRaw);
     lastSnapshot=mergedRaw;
   }
   if(JSON.stringify(merged)!==JSON.stringify(cloud))await pushState();
   badge.textContent='Sincronizado';
 }

 async function publishReceipts(){
   const state=readLocal();
   for(const p of state.payments||[]){
     if(!p.code)continue;
     await timeout(setDoc(doc(db,'publicReceipts',p.code),{
       code:p.code,
       date:p.date,
       amount:Number(p.amount||0),
       installment:p.installment,
       status:'VALIDO',
       updatedAt:serverTimestamp()
     },{merge:true}));
   }
 }

 badge.addEventListener('click',async()=>{
   try{
     if(auth.currentUser){await signOut(auth);return}
     badge.textContent='A autenticar…';
     await signInWithPopup(auth,provider);
   }catch(e){console.error(e);badge.textContent='Erro no login'}
 });

 onAuthStateChanged(auth,async user=>{
   uid=user?.uid||null;
   if(!uid){badge.textContent='Ligar à nuvem';return}
   badge.textContent='A sincronizar…';
   try{
     await initialSync();
     badge.textContent='Sincronizado';
     publishReceipts().catch(console.error);
   }catch(e){
     console.error(e);
     badge.textContent=e?.message==='TIMEOUT'?'Ligação lenta':'Erro de sincronização';
   }
 });

 setInterval(async()=>{
   if(!uid||syncing)return;
   const current=localStorage.getItem(KEY)||'';
   if(current!==lastSnapshot){
     badge.textContent='A sincronizar…';
     try{await pushState();publishReceipts().catch(console.error)}catch(e){console.error(e);badge.textContent='Erro de sincronização'}
   }
 },7000);

 async function validatePublic(code){
   if(!code)return;
   const box=document.querySelector('#vr');
   try{
     const snap=await timeout(getDoc(doc(db,'publicReceipts',code)));
     if(!snap.exists()){box.innerHTML='<b style="color:#b42318">Código não encontrado na base online.</b>';return}
     const p=snap.data();
     const money=new Intl.NumberFormat('pt-PT',{style:'currency',currency:'AOA'}).format(Number(p.amount||0)).replace('AOA','Kz');
     box.innerHTML=`<b style="color:#18794e">COMPROVATIVO ${p.status||'VALIDO'}</b><br>Data: ${p.date||'-'}<br>Valor: ${money}<br>Prestação: ${p.installment||'-'}`;
   }catch(e){box.innerHTML='<b style="color:#b54708">Não foi possível consultar a base online neste momento.</b>'}
 }

 document.querySelector('#vb')?.addEventListener('click',()=>validatePublic(document.querySelector('#vc')?.value.trim()));
 const hash=new URLSearchParams(location.hash.replace('#',''));
 if(hash.get('validate'))validatePublic(hash.get('validate'));
}
