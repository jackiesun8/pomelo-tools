function isPort(str) {
	var parten = /^(\d)+$/g;
	if (parten.test(str) && parseInt(str) <= 65535 && parseInt(str) >= 0) {
		return true;
	} else {
		return false;
	}
}

function isIP(strIP) {
	var re = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/g
	if (re.test(strIP)) {
		if (RegExp.$1 < 256 && RegExp.$2 < 256 && RegExp.$3 < 256 && RegExp.$4 < 256) return true;
	}
	return false;
}

function checkAddress(who, address) {
	address = address.split(':')
	if (address.length != 2) {
		console.log(who + ': address must be a array that contains ip and port')
		return false;
	}
	if (!isIP(address[0])) {
		console.log(who + ': ip is illegal')
		return false;
	}
	if (!isPort(address[1])) {
		console.log(who + ': port is illegal')
		return false;
	}
	return true;
}

function register(username, password, login_address, gate_address) {
	var http = window.browser_http
	http.request('http://' + login_address + '/register', {
		type: 'POST',
		data: {
			username: username,
			password: password
		}
	}, function(response, err) {
		if (!err) {
			if (response.data.code == 501) {
				console.log('username is exist')
			} else if (response.data.code == 500) {
				console.log('register failed')
			} else if (response.data.code == 200) {
				console.log('register success,auto login again')
				login(username, password, login_address, gate_address)
			} else {
				console.log('no sense')
			}
		} else {
			throw err; // some error occurred
		}
	})
}

function login(username, password, login_address, gate_address) {
	var http = window.browser_http
	http.request('http://' + login_address + '/login', {
		type: 'POST',
		data: {
			username: username,
			password: password
		}
	}, function(response, err) {
		if (!err) {
			if (response.data.code == 501) {
				console.log('username not exist,auto register')
				register(username, password, login_address, gate_address)
			} else if (response.data.code == 502) {
				console.log('password is error')
			} else if (response.data.code == 500) {
				console.log('login failed')
			} else if (response.data.code == 200) {
				console.log('login success')
				var localStorage = window.web_storage().localStorage
				localStorage.set('temp_uid', response.data.uid)
				localStorage.set('temp_token', response.data.token)
				localStorage.set('temp_gate', gate_address)
				window.location.href = 'main.html'
			} else {
				console.log('no sense')
			}
		} else {
			throw err; // some error occurred
		}
	})
}

function guestLogin(login_address, gate_address, isRemember) {
	var http = window.browser_http
	http.request('http://' + login_address + '/auto_register', {
		type: 'POST',
		data: {}
	}, function(response, err) {
		var username = response.data.username
		var password = response.data.password
		if (!username) {
			return console.log('username returned is error')
		}
		if (!password) {
			return console.log('password returned is error')
		}
		console.log('username returned is:' + username)
		console.log('password returned is:' + password)
		if (isRemember) {
			var localStorage = window.web_storage().localStorage
			localStorage.set('username', username)
			localStorage.set('password', password)
			$('#inputUserName').attr('value', localStorage.get('username'))
			$('#inputPassword').attr('value', localStorage.get('password'))
		}
		login(username, password, login_address, gate_address)
	})
}
$(document).ready(function() {
	console.log('the document index is ready now')

	var localStorage = window.web_storage().localStorage
	if (localStorage.get('username')) {
		$('#inputUserName').attr('value', localStorage.get('username'))
	}
	if (localStorage.get('password')) {
		$('#inputPassword').attr('value', localStorage.get('password'))
	}
	if (localStorage.get('login')) {
		$('#inputLogin').attr('value', localStorage.get('login'))
	}
	if (localStorage.get('gate')) {
		$('#inputGate').attr('value', localStorage.get('gate'))
	}

	$('#loginButton').click(function() {
		console.log('login button is pressed')

		var username = $('#inputUserName').val();
		var password = $('#inputPassword').val();
		var login_ip_port = $('#inputLogin').val();
		var gate_ip_port = $('#inputGate').val();
		var isRemember = $('input[name="remember"]').is(':checked')
		if (!username) {
			return console.log('username is error')
		}
		if (!password) {
			return console.log('password is error')
		}
		console.log(username)
		console.log(password)
		if (!checkAddress('login', login_ip_port)) return;
		if (!checkAddress('gate', gate_ip_port)) return;
		console.log(login_ip_port)
		console.log(gate_ip_port)
		if (isRemember) {
			localStorage.set('username', username)
			localStorage.set('password', password)
			localStorage.set('login', login_ip_port)
			localStorage.set('gate', gate_ip_port)
		}
		login(username, password, login_ip_port, gate_ip_port)
	})
	$('#guestLoginButton').click(function() {
		console.log('guest login button is pressed')
		var login_ip_port = $('#inputLogin').val();
		var gate_ip_port = $('#inputGate').val();
		var isRemember = $('input[name="remember"]').is(':checked')
		if (!checkAddress('login', login_ip_port)) return;
		if (!checkAddress('gate', gate_ip_port)) return;
		console.log(login_ip_port)
		console.log(gate_ip_port)
		if (isRemember) {
			localStorage.set('login', login_ip_port)
			localStorage.set('gate', gate_ip_port)
		}
		guestLogin(login_ip_port, gate_ip_port, isRemember)
	})
});