function tip(tipString) {
	$.isLoading('hide')
	$.isLoading({
		text: tipString
	})
	setTimeout(function() {
		$.isLoading("hide");
		window.location.href = 'index.html'
	}, 2000);
}

function login_success() {
	setTimeout(function() {
		$.isLoading("hide");
	}, 500);
}

function connectToGameServer(uid, token, gate) {
	console.log(uid, token, gate)
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
				if (data.code == 2001) {
					tip('连接服务器失败，2秒后自动跳转')
					return console.log('no connector available')
				} else if (data.code == 500) {
					tip('连接服务器失败，2秒后自动跳转')
					return console.log('gate.gateHandler.queryConnector failed')
				} else if (data.code == 200) {
					console.log('gate.gateHandler.queryConnector success')
				} else {
					tip('连接服务器失败，2秒后自动跳转')
					return console.log('no sense')
				}

				pomelo.disconnect();

				pomelo.init({
					host: data.host,
					port: data.port,
					log: true
				}, function() {
					var route = 'connector.connectorHandler.connect';
					pomelo.request(route, {
						token: token
					}, function(data) {
						if (data.code == 200) {
							console.log('connector.connectorHandler.connect success')
							login_success()
						} else if (data.code == 500) {
							tip('连接服务器失败，2秒后自动跳转')
							console.log('gate.gateHandler.queryConnector failed')
						} else if (data.code = 1001) {
							tip('连接服务器失败，2秒后自动跳转')
							console.log('token invalid')
						} else if (data.code == 1002) {
							tip('连接服务器失败，2秒后自动跳转')
							console.log('token expired')
						} else if (data.code = 1003) {
							tip('连接服务器失败，2秒后自动跳转')
							console.log('user not exist')
						} else {
							tip('连接服务器失败，2秒后自动跳转')
							console.log('no sense')
						}
					});
				});
			});
		});
}

$(document).ready(function() {
	$.isLoading({
		text: '连接服务器中...'
	})
	var localStorage = window.web_storage().localStorage
	var uid = localStorage.get('temp_uid')
	var token = localStorage.get('temp_token')
	var gate = localStorage.get('temp_gate')

	if (!uid || !token || !gate) {
		tip('连接失败，参数不正确，2秒后自动跳转')
	}
	connectToGameServer(uid, token, gate)

	console.log('the document main is ready now')
	var pomelo = window.pomelo

	$('#goButton').click(function() {
		console.log('go button is pressed')
		var interface = $('#inputInterface').val()
		var request = $('#inputRequest').val()
		var isNotify = $('input[name="isNotify"]').is(':checked')

		console.log(interface)
		console.log(request)
		console.log(isNotify)
		var obj = eval('(' + '{' + request + '}' + ')');

		console.log(obj)
		if (!isNotify) {
			pomelo.request(interface, obj, function(data) {
				$("#outputResponse").JSONView(data);
			})
		} else {
			pomelo.notify(interface, obj)
		}
	});

	$('input[name="isNotify"]').click(function() {
		if ($(this).is(':checked')) {
			$('#outputGroup').hide()
		} else {
			$('#outputGroup').show()
		}
	});
	$('#collapse-btn').on('click', function() {
		$('#outputResponse').JSONView('collapse');
	});
	$('#expand-btn').on('click', function() {
		$('#outputResponse').JSONView('expand');
	});
	$('#addButton').click(function() {
		console.log('add button is pressed');
		var interface = $('#inputInterfaceListen').val()
		console.log(interface)
		$('#pushTable').bootstrapTable('append', {
			interface: 'onChat',
			push: '<div class="input-div"></div>'
		})
	})
});