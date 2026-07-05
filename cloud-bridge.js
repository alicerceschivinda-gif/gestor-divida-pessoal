import { getApps } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getAuthReady(){
  for(let i=0;i<40;i++){
    const apps=getApps();
    if(apps.length) return getAuth(apps[0]);
    await sleep(250);
  }
  throw new Error('Firebase não iniciou. Actualize a página.');
}

window.GDP_CLOUD = {
  async getIdToken(){
    const auth=await getAuthReady();
    if(!auth.currentUser) return null;
    return auth.currentUser.getIdToken(true);
  },
  async isAuthenticated(){
    const auth=await getAuthReady();
    return Boolean(auth.currentUser);
  }
};
