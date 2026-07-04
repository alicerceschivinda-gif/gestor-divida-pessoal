import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const KEY = 'gdp_v1';
const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && cfg.apiKey !== 'COLE_AQUI';
const badge = document.createElement('button');
badge.id = 'cloudStatus';
badge.textContent = configured ? 'Ligar à nuvem' : 'Modo local';
badge.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:20;border:0;border-radius:999px;padding:10px 14px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;background:#fff;color:#172033';
document.body.appendChild(badge);

if (configured) {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  let uid = null;
  let syncing = false;
  let lastSnapshot = localStorage.getItem(KEY) || '';

  function localState() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{"debt":{},"plan":[],"payments":[]}'); }
    catch { return { debt:{}, plan:[], payments:[] }; }
  }

  function useful(s) {
    return Number(s?.debt?.amount || 0) > 0 || (s?.plan?.length || 0) > 0 || (s?.payments?.length || 0) > 0;
  }

  async function pushState() {
    if (!uid || syncing) return;
    syncing = true;
    try {
      const raw = localStorage.getItem(KEY) || '{"debt":{},"plan":[],"payments":[]}';
      const state = JSON.parse(raw);
      await setDoc(doc(db, 'users', uid, 'state', 'main'), { ...state, updatedAt: serverTimestamp() });
      lastSnapshot = raw;
      badge.textContent = 'Sincronizado';
    } finally {
      syncing = false;
    }
  }

  async function initialSync() {
    const local = localState();
    const snap = await getDoc(doc(db, 'users', uid, 'state', 'main'));
    if (!snap.exists()) {
      await pushState();
      return;
    }
    const cloud = snap.data();
    delete cloud.updatedAt;

    if (useful(local) && !useful(cloud)) {
      await pushState();
      return;
    }

    const localRaw = JSON.stringify(local);
    const cloudRaw = JSON.stringify(cloud);
    if (localRaw === cloudRaw) {
      lastSnapshot = localStorage.getItem(KEY) || '';
      badge.textContent = 'Sincronizado';
      return;
    }

    localStorage.setItem(KEY, cloudRaw);
    lastSnapshot = cloudRaw;
    badge.textContent = 'Sincronizado';
    const key = 'gdp_cloud_reloaded_' + uid;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      location.reload();
    }
  }

  async function publishReceipts() {
    const state = localState();
    for (const p of state.payments || []) {
      if (!p.code) continue;
      await setDoc(doc(db, 'publicReceipts', p.code), {
        code: p.code,
        date: p.date,
        amount: Number(p.amount || 0),
        installment: Number(p.installment || 0),
        ref: p.ref || '',
        status: 'VALIDO',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }

  badge.addEventListener('click', async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
        return;
      }
      badge.textContent = 'A autenticar…';
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      badge.textContent = 'Erro no login';
    }
  });

  onAuthStateChanged(auth, async user => {
    uid = user?.uid || null;
    if (!uid) {
      badge.textContent = 'Ligar à nuvem';
      return;
    }
    try {
      badge.textContent = 'A sincronizar…';
      await initialSync();
      await publishReceipts();
      badge.textContent = 'Sincronizado';
    } catch (e) {
      console.error(e);
      badge.textContent = 'Erro de sincronização';
    }
  });

  setInterval(async () => {
    if (!uid || syncing) return;
    const current = localStorage.getItem(KEY) || '';
    if (current !== lastSnapshot) {
      try {
        badge.textContent = 'A sincronizar…';
        await pushState();
        await publishReceipts();
      } catch (e) {
        console.error(e);
        badge.textContent = 'Erro de sincronização';
      }
    }
  }, 5000);

  async function validatePublic(code) {
    if (!code) return;
    const snap = await getDoc(doc(db, 'publicReceipts', code));
    const box = document.querySelector('#vr');
    if (!box) return;
    if (!snap.exists()) {
      box.innerHTML = '<b style="color:#b42318">Código não encontrado na base online.</b>';
      return;
    }
    const p = snap.data();
    const money = new Intl.NumberFormat('pt-PT',{style:'currency',currency:'AOA'}).format(Number(p.amount||0)).replace('AOA','Kz');
    box.innerHTML = `<b style="color:#18794e">RECIBO ${p.status || 'VALIDO'}</b><br>Data: ${p.date || '-'}<br>Valor: ${money}<br>Prestação: ${p.installment || '-'}<br>Referência: ${p.ref || '-'}`;
  }

  document.querySelector('#vb')?.addEventListener('click', () => validatePublic(document.querySelector('#vc')?.value.trim()));
  const hash = new URLSearchParams(location.hash.replace('#',''));
  if (hash.get('validate')) validatePublic(hash.get('validate'));
}
