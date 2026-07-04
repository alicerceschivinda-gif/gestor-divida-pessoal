import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js';

const KEY = 'gdp_v1';
const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && cfg.apiKey !== 'COLE_AQUI';

const badge = document.createElement('button');
badge.id = 'cloudStatus';
badge.textContent = configured ? 'Ligar à nuvem' : 'Modo local';
badge.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:20;border:0;border-radius:999px;padding:10px 14px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer';
document.body.appendChild(badge);

if (!configured) {
  badge.title = 'Firebase ainda não configurado. A aplicação continua funcional em modo local.';
} else {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const provider = new GoogleAuthProvider();
  let uid = null;
  let lastSnapshot = localStorage.getItem(KEY) || '';

  async function pushState() {
    if (!uid) return;
    const raw = localStorage.getItem(KEY) || '{"debt":{},"plan":[],"payments":[]}';
    const state = JSON.parse(raw);
    await setDoc(doc(db, 'users', uid, 'state', 'main'), { ...state, updatedAt: serverTimestamp() });
    lastSnapshot = raw;
    badge.textContent = 'Sincronizado';
  }

  async function pullState() {
    if (!uid) return;
    const snap = await getDoc(doc(db, 'users', uid, 'state', 'main'));
    if (snap.exists()) {
      const d = snap.data();
      delete d.updatedAt;
      localStorage.setItem(KEY, JSON.stringify(d));
      lastSnapshot = localStorage.getItem(KEY) || '';
      location.reload();
    } else {
      await pushState();
    }
  }

  async function publishReceipts() {
    if (!uid) return;
    const state = JSON.parse(localStorage.getItem(KEY) || '{"debt":{},"plan":[],"payments":[]}');
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

  async function uploadSelectedProof() {
    if (!uid) return;
    const input = document.querySelector('#file');
    const file = input?.files?.[0];
    if (!file) return;
    const state = JSON.parse(localStorage.getItem(KEY) || '{"payments":[]}');
    const p = state.payments?.[state.payments.length - 1];
    if (!p?.code) return;
    badge.textContent = 'A enviar comprovativo…';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = ref(storage, `users/${uid}/proofs/${p.code}-${safeName}`);
    await uploadBytes(fileRef, file);
    p.proofUrl = await getDownloadURL(fileRef);
    localStorage.setItem(KEY, JSON.stringify(state));
    await pushState();
  }

  badge.addEventListener('click', async () => {
    if (auth.currentUser) {
      await signOut(auth);
      return;
    }
    await signInWithPopup(auth, provider);
  });

  onAuthStateChanged(auth, async user => {
    uid = user?.uid || null;
    if (!uid) {
      badge.textContent = 'Ligar à nuvem';
      return;
    }
    badge.textContent = 'A sincronizar…';
    await pullState();
  });

  setInterval(async () => {
    if (!uid) return;
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
  }, 2500);

  document.querySelector('#savePay')?.addEventListener('click', () => {
    setTimeout(() => uploadSelectedProof().catch(console.error), 400);
  });

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
