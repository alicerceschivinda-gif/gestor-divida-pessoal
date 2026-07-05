(() => {
  const KEY='gdp_v1';
  const DRIVE_ENDPOINT='https://script.google.com/macros/s/AKfycbzgLC55l4caJ3MQISp1Qyrj9ykgYI7Q-2gzme68y4E-RZIe_B5g5iEXdQtSHAtl5PvK/exec';

  function fileToBase64(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(String(r.result).split(',')[1]||'');
      r.onerror=reject;
      r.readAsDataURL(file);
    });
  }

  function readState(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{"debt":{},"plan":[],"payments":[]}')}
    catch{return {debt:{},plan:[],payments:[]}}
  }

  function writeState(state){
    localStorage.setItem(KEY,JSON.stringify(state));
    if(typeof window.render==='function') window.render();
  }

  async function uploadProof(file,payment){
    if(!window.GDP_CLOUD?.getIdToken) throw new Error('Sessão Firebase indisponível. Inicie sessão na nuvem.');
    const idToken=await window.GDP_CLOUD.getIdToken();
    if(!idToken) throw new Error('Sessão Firebase não autenticada.');

    const base64=await fileToBase64(file);
    const body=new URLSearchParams({
      idToken,
      fileName:file.name,
      mimeType:file.type||'application/octet-stream',
      base64,
      paymentCode:payment.code||`GDP-${Date.now()}`
    });

    const response=await fetch(DRIVE_ENDPOINT,{method:'POST',body});
    const data=await response.json();
    if(!data.ok) throw new Error(data.error||'Falha no envio ao Google Drive.');
    return data;
  }

  const saveButton=document.querySelector('#savePay');
  const fileInput=document.querySelector('#file');
  if(!saveButton||!fileInput)return;

  saveButton.addEventListener('click',async()=>{
    const file=fileInput.files?.[0];
    if(!file)return;

    const originalText=saveButton.textContent;
    setTimeout(async()=>{
      try{
        saveButton.disabled=true;
        saveButton.textContent='A enviar ao Drive…';

        const state=readState();
        const payment=state.payments?.[state.payments.length-1];
        if(!payment) throw new Error('Pagamento não encontrado após o registo.');

        const result=await uploadProof(file,payment);
        const fresh=readState();
        const target=fresh.payments?.find(p=>p.code===payment.code) || fresh.payments?.[fresh.payments.length-1];
        if(!target) throw new Error('Não foi possível associar o comprovativo ao pagamento.');

        target.driveFileId=result.fileId;
        target.driveUrl=result.viewUrl;
        target.fileName=result.fileName||file.name;
        writeState(fresh);
        alert('Pagamento guardado e comprovativo enviado ao Google Drive.');
      }catch(err){
        console.error(err);
        alert('O pagamento foi guardado, mas o envio ao Google Drive falhou: '+err.message);
      }finally{
        saveButton.disabled=false;
        saveButton.textContent=originalText;
      }
    },150);
  },true);
})();
