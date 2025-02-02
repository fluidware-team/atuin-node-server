function validate() {
  var username = window.document.getElementById('floatingUsername').value;
  var password = window.document.getElementById('floatingPassword').value;
  var code = window.document.getElementById('floatingCode').value;
  if (username === '') {
    window.alert('Please enter a username');
    return false;
  }
  if (password === '') {
    window.alert('Please enter a password');
    return false;
  }
  if (code === '') {
    window.alert('Please enter a code');
    return false;
  }
  window
    .fetch('/account/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
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
