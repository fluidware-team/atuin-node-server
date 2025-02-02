function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    document.getElementById('floatingCode').value = code;
    document.getElementById('floatingUsername').focus();
  } else {
    document.getElementById('floatingCode').focus();
  }
}

function acceptInvite() {
  const code = document.getElementById('floatingCode').value;
  const username = document.getElementById('floatingUsername').value;
  const password = document.getElementById('floatingPassword').value;
  if (!code || !username || !password) {
    alert('Please enter the invitation code, username and password');
    return;
  }
  fetch('/account/accept-invitation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, username, password })
  })
    .then(res => {
      return res.json();
    })
    .then(data => {
      if (data.reason) {
        window.document.getElementById('errorMessage').innerText = data.reason;
        window.document.getElementById('alertBlock').classList.remove('d-none');
      } else {
        window.document.getElementById('formblock').classList.add('d-none');
        window.document.getElementById('validationok').classList.remove('d-none');
      }
    })
    .catch(err => {
      window.document.getElementById('errorMessage').innerText = err.message;
      window.document.getElementById('alertBlock').classList.remove('d-none');
    });
}
