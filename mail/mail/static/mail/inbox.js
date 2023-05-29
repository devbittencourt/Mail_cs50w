document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  // Event listeners para os botões que alternam entre as visualizações
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email('new'));

  // By default, load the inbox
  // Por padrão, carrega a caixa de entrada
  load_mailbox('inbox');
});

function compose_email(type, email) {

  // Show compose view and hide other views
  // Exibe a visualização de composição e oculta as outras visualizações
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Recipients field read only when replying to emails
  // O campo de destinatários é somente leitura ao responder e-mails
  document.querySelector('#compose-recipients').readOnly = (type === 'new') ? false : true;

  // Initially set email variables
  // Define inicialmente as variáveis do email
  var title, recipients, subject, body;
  recipients = ''; 
  subject = '';
  body = '';
  title = (type === 'reply') ? "Reply to email" : "New Email";

  // Saving elements on the page to use later
  // Salva os elementos da página para uso posterior
  const submitButton = document.querySelector('#compose-submit');
  const recipientsList = document.querySelector('#compose-recipients');

  // Prepopulating fields when in "reply" mode and setting recipients field to readonly
  // Pré-preenche os campos quando estiver no modo "resposta" e define o campo de destinatários como somente leitura
  if (type === 'reply') {
    recipients = email.sender;
    subject = (email.subject.slice(0,3) === 'Re:') ? email.subject : `Re: ${email.subject}`;
    body = `\n\n>> On ${email.timestamp} ${email.sender} wrote: \n${email.body}`;
  } 

  // Set HTML elements for new email
  // Define elementos HTML para o novo email
  document.querySelector('#compose-title').innerHTML = title;
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;

  // Remove any validation messages
  // Remove quaisquer mensagens de validação
  document.querySelector('#compose-result').innerHTML = '';
  document.querySelector('#compose-result').style.display = 'none';

  // Make sure submit button is blocked in correct circumstances
  // Garante que o botão de envio esteja bloqueado nas circunstâncias corretas
  blockButtonForField(submitButton, recipientsList)

  // Listen for submission of form
  // Ouve o envio do formulário
  document.querySelector('#compose-form').onsubmit = () => {
    
    // Saves email content in form into an object to pass into sendEmail function
    // Salva o conteúdo do email no formulário em um objeto para passar para a função sendEmail
    const emailObject = {
      recipients: recipientsList.value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    };

    sendEmail(emailObject)

    // Prevents form automatically submitting
    // Impede o envio automático do formulário
    return false;
  };
  
}

function sendEmail(emailObject) {
  // Makes POST request to send email using form fields
  // Faz uma solicitação POST para enviar o email usando os campos do formulário
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: emailObject.recipients,
      subject: emailObject.subject,
      body: emailObject.body
    })
  })
  .then(response => response.json())
  .then(result => {
    // If successful, load user's sent inbox
    // Se for bem-sucedido, carrega a caixa de saída do usuário
    if (!result.error) {
      load_mailbox('sent')
    } 
    else {
      document.querySelector('#compose-result').innerHTML = result.error;
      document.querySelector('#compose-result').style.display = 'block';
      scroll(0,0);
    }
  })
  .catch(error => {
    console.error(error);
  })

}

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  // Exibe a caixa de correio e oculta as outras visualizações
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  // Exibe o nome da caixa de correio
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Get emails
  // Obtém os emails
  getEmailsHTML(mailbox);

}

// Updates webpage HTML to include all emails for given mailbox
// Atualiza o HTML da página da web para incluir todos os emails da caixa de correio especificada
async function getEmailsHTML(mailbox) {
  
  // Waits for the email JSON data
  // Aguarda os dados JSON dos emails
  const emails = await getAllEmails(mailbox);

  // If no emails, update HTML
  // Se não houver emails, atualiza o HTML
  if (emails.length === 0) {
    const noResults = document.createElement('div');
    noResults.innerHTML = "You have 0 messages.";
    document.getElementById("emails-view").appendChild(noResults);
  }

  // Creates HTML for each individual email in mailbox table
  // Cria o HTML para cada email individual na tabela da caixa de correio
  emails.forEach((email, index) => {
    
    // Adds new div with HTML and styling to show email information
    // Adiciona uma nova div com HTML e estilos para mostrar as informações do email
    const emailDiv = document.createElement('div');
    
    // Sets first column according to mailbox
    // Define a primeira coluna de acordo com a caixa de correio
    let firstColumn = (mailbox != "sent") ? `From: ${email.sender}` : `<strong>To: ${email.recipients}</strong>`;
    
    emailDiv.innerHTML = `
      <div class="col-6 col-sm-7 col-md-4 p-2 text-truncate">${firstColumn}</div>
      <div class="col-6 col-sm-5 col-md-3 p-2 order-md-2 small text-right text-muted font-italic font-weight-lighter align-self-center">${email.timestamp}</div>
      <div class="col px-2 pb-2 pt-md-2 order-md-1 text-truncate">${email.subject}</div>
    `;
    emailDiv.className = 'row justify-content-between border border-left-0 border-right-0 border-bottom-0 pointer-link p-2';

    // Adds grey background for read emails in Inbox
    // Adiciona um fundo cinza para emails lidos na Caixa de entrada
    if (mailbox === "inbox" && email.read == true) {
      emailDiv.style.backgroundColor = '#f1f2f3';
    } 
    // Makes unread emails bold
    // Torna os emails não lidos em negrito
    if (mailbox === "inbox" && email.read == false) {
      emailDiv.classList.add('font-weight-bold');
    }

    // Adds event listener for each email to call openEmail function when clicked
    // Adiciona um ouvinte de eventos para cada email para chamar a função openEmail quando clicado
    emailDiv.addEventListener('click', function () {
      openEmail(email, mailbox);
    },)

    // Fixes borders (the last child has borders on all edges, all others don't have a border on the bottom)
    // Corrige as bordas (o último filho tem bordas em todas as bordas, todos os outros não têm borda na parte inferior)
    if (index == emails.length - 1) {
      emailDiv.classList.remove('border-bottom-0');
    }

    // Adds email HTML to the mailbox webpage
    // Adiciona o HTML do email à página da web da caixa de correio
    document.getElementById("emails-view").appendChild(emailDiv);

  });
}

// Fetches email JSON data for given mailbox
// Obtém os dados JSON dos emails para a caixa de correio especificada
async function getAllEmails(mailbox) {
  const response = await fetch(`/emails/${mailbox}`);
  const jsonEmailData = await response.json();
  return jsonEmailData;
}

function openEmail(email, mailbox) {
  // Mark as read if unread
  // Marca como lido se estiver não lido
  if (!email.read) {
    readEmail(email)
  }
  // Gets email HTML
  // Obtém o HTML do email
  getEmail(email, mailbox)
}

// Marks email as read
// Marca o email como lido
function readEmail(email) {
  fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  });
}

function getEmail(email, mailbox) {
  
  // Show the mailbox and hide other views
  // Exibe a caixa de correio e oculta as outras visualizações
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  
  document.querySelector('#email-view').innerHTML = `
  <div class="d-flex justify-content-between flex-nowrap-sm flex-wrap">
    <h5 class="text-wrap">${email.subject}</h5>
    <small class="mr-lg-4 ml-0 ml-sm-2 font-weight-lighter align-self-center text-muted text-right"><em>${email.timestamp}</em></small>
  </div>

  <div class="d-flex justify-content-between py-3 pt-md-2 border-bottom flex-wrap">
    <div>
      <strong>From:</strong> ${email.sender}<br>
      <strong>To:</strong> ${email.recipients}<br>
    </div>
    <div class="text-nowrap mr-lg-4 ml-0 ml-sm-2" id="buttons">
    </div>
  </div>
  
  <div class="pt-md-2">
    <pre>${email.body}</pre>
  </div>`;

  // Archive and Unarchive buttons for emails in inbox
  // Botões de Arquivar e Desarquivar para emails na caixa de entrada
  if (mailbox === "inbox") {
    var archiveButton = document.createElement('button');
    archiveButton.className = "btn btn-outline-primary btn-sm";
    archiveButton.innerHTML = email.archived ? 'Unarchive' : 'Archive';
    archiveButton.addEventListener('click', () => toggleArchive(email));
    document.getElementById("buttons").appendChild(archiveButton);
  }

  // Reply button
  // Botão de Responder
  var replyButton = document.createElement('button');
  replyButton.className = "btn btn-outline-primary btn-sm ml-2";
  replyButton.innerHTML = 'Reply';
  replyButton.addEventListener('click', () => compose_email('reply', email));
  document.getElementById("buttons").appendChild(replyButton);
}

function toggleArchive(email) {
  fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: !email.archived
    })
  })
  .then(() => load_mailbox('inbox'))
  .catch(error => {
    console.error(error);
  })
}

// Function to block submit button if the "recipients" field is empty
// Função para bloquear o botão de envio se o campo "recipients" estiver vazio
function blockButtonForField(button, field) {
  field.addEventListener("input", () => {
    button.disabled = field.value.trim().length === 0;
  });
  button.disabled = field.value.trim().length === 0;
}
