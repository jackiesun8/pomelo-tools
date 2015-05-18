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

function register(username, password, address) {
	var http = window.browser_http
	http.request('http://' + address + '/register', {
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
				login(username, password, address)
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
				register(username, password, login_address)
			} else if (response.data.code == 502) {
				console.log('password is error')
			} else if (response.data.code == 500) {
				console.log('login failed')
			} else if (response.data.code == 200) {
				console.log('login success')
				connectToGameServer(response.data.uid, response.data.token, gate_address)
			} else {
				console.log('no sense')
			}
		} else {
			throw err; // some error occurred
		}
	})
}

function connectToGameServer(uid, token, gate) {
	var pomelo = window.pomelo;

	var route = 'gate.gateHandler.queryConnector';
	var gate_ip_port = gate.split(':')

	pomelo.init({
			host: gate_ip_port[0],
			port: gate_ip_port[1],
			log: true
		},
		function() {
			pomelo.request(route, {
				uid: uid
			}, function(data) {
				if (data.code == 600) {
					return console.log('no connector available')
				} else if (data.code == 500) {
					return console.log('gate.gateHandler.queryConnector failed')
				} else if (data.code == 200) {
					console.log('gate.gateHandler.queryConnector success')
				} else {
					return console.log('no sense')
				}

				pomelo.disconnect();

				pomelo.init({
					host: data.host,
					port: data.port,
					log: true
				}, function() {
					var route = "connector.connectorHandler.connect";
					pomelo.request(route, {
						token: token
					}, function(data) {
						console.log(data.code);
					});
				});
			});
		});
}
$(document).ready(function() {
	console.log('the document index is ready now')
	if ($.cookie('username')) {
		$('#inputUserName').attr('value', $.cookie('username'))
	}
	if ($.cookie('password')) {
		$('#inputPassword').attr('value', $.cookie('password'))
	}
	if ($.cookie('login')) {
		$('#inputLogin').attr('value', $.cookie('login'))
	}
	if ($.cookie('gate')) {
		$('#inputGate').attr('value', $.cookie('gate'))
	}

	var pomelo = window.pomelo
	var http = window.browser_http
	console.log(pomelo)
	console.log(http)
	$('#loginButton').click(function() {
		console.log("login button is pressed")

		var username = $('#inputUserName').val();
		var password = $('#inputPassword').val();
		var login_ip_port = $('#inputLogin').val();
		var gate_ip_port = $('#inputGate').val();
		var isRemember = $('input[name="remember"]').is(":checked")
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
			$.cookie('username', username)
			$.cookie('password', password)
			$.cookie('login', login_ip_port)
			$.cookie('gate', gate_ip_port)
		}
		login(username, password, login_ip_port, gate_ip_port)
	})
});