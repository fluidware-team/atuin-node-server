function resetPasswordRequest() {
  var username = window.document.getElementById('floatingUsername').value;
  var email = window.document.getElementById('floatingEmail').value;
  if (username === '') {
    window.alert('Please enter your username');
    return false;
  }
  if (email === '') {
    window.alert('Please enter your email');
    return false;
  }
  window
    .fetch('/account/forgot-password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        email: email
      })
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

function resetPassword() {
  var password = window.document.getElementById('floatingPassword').value;
  var code = window.document.getElementById('floatingCode').value;

  if (password === '') {
    window.alert('Please enter your new password');
    return false;
  }

  if (code === '') {
    window.alert('Please enter the reset token');
    return false;
  }
  window
    .fetch('/account/reset-password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        password: password,
        code: code
      })
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
