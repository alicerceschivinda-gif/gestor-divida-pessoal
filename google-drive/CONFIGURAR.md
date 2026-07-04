# Configurar Google Drive para o Gestor de Dívida Pessoal

## 1. Criar o projecto Apps Script

1. Abra https://script.google.com/
2. Clique em **Novo projecto**.
3. Dê o nome: `Gestor Divida Pessoal Drive API`.
4. Abra o ficheiro `Code.gs`.
5. Apague o conteúdo existente.
6. Copie para lá o conteúdo de `google-drive/Code.gs` deste repositório.
7. Guarde.

## 2. Configurar Propriedades do Script

No Apps Script:

1. Abra **Definições do projecto**.
2. Em **Propriedades do script**, adicione:

- `FIREBASE_API_KEY` = a chave API do projecto Firebase.
- `ALLOWED_EMAIL` = o e-mail Google autorizado a enviar comprovativos.

## 3. Publicar como Web App

1. Clique em **Implementar** > **Nova implementação**.
2. Escolha o tipo **Aplicação Web**.
3. Executar como: **Eu**.
4. Quem tem acesso: **Qualquer pessoa**.
5. Clique em **Implementar**.
6. Autorize as permissões solicitadas.
7. Copie o URL terminado em `/exec`.

## 4. Resultado no Drive

O script cria automaticamente:

`GESTOR_DIVIDA_PESSOAL/COMPROVATIVOS`

Cada comprovativo é guardado com o código do pagamento no nome do ficheiro.

## 5. Próxima etapa

Copie o URL `/exec` da Web App e forneça-o para ligação ao frontend da aplicação.
