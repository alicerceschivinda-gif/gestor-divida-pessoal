const ROOT_FOLDER_NAME = 'GESTOR_DIVIDA_PESSOAL';
const PROOFS_FOLDER_NAME = 'COMPROVATIVOS';

function doGet() {
  return json_({ ok: true, service: 'Gestor Divida Pessoal Drive API' });
}

function doPost(e) {
  try {
    if (!e || !e.parameter) throw new Error('Pedido inválido.');

    const idToken = String(e.parameter.idToken || '');
    const fileName = sanitizeName_(String(e.parameter.fileName || 'comprovativo'));
    const mimeType = String(e.parameter.mimeType || 'application/octet-stream');
    const base64 = String(e.parameter.base64 || '');
    const paymentCode = sanitizeName_(String(e.parameter.paymentCode || 'SEM-CODIGO'));

    if (!idToken) throw new Error('Autenticação em falta.');
    if (!base64) throw new Error('Ficheiro em falta.');

    const user = verifyFirebaseUser_(idToken);
    const allowedEmail = PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAIL');
    if (allowedEmail && String(user.email || '').toLowerCase() !== allowedEmail.toLowerCase()) {
      throw new Error('Utilizador não autorizado.');
    }

    const root = getOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    const proofs = getOrCreateFolder_(root, PROOFS_FOLDER_NAME);

    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, `${paymentCode}-${fileName}`);
    const file = proofs.createFile(blob);
    file.setDescription(`Comprovativo de pagamento ${paymentCode}`);

    return json_({
      ok: true,
      fileId: file.getId(),
      fileName: file.getName(),
      viewUrl: file.getUrl(),
      paymentCode: paymentCode
    });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function verifyFirebaseUser_(idToken) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY');
  if (!apiKey) throw new Error('FIREBASE_API_KEY não configurada nas propriedades do script.');

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText() || '{}');
  if (status !== 200 || !body.users || !body.users.length) {
    throw new Error('Token Firebase inválido ou expirado.');
  }
  return body.users[0];
}

function getOrCreateFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function sanitizeName_(name) {
  return name.replace(/[\\/:*?"<>|\r\n]+/g, '_').trim().substring(0, 180) || 'ficheiro';
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
