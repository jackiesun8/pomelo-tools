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

function listenInterface(interface) {
	console.log('listening {}'.format(interface))
	var localStorage = window.web_storage().localStorage
	pomelo.on(interface, function(data) {
		console.debug('receive push,interface is:{}'.format(interface))
		var interfacesStored = localStorage.get('interfacesStored')
		console.log(data)
		console.log('interface "{}" has push data'.format(interface))
		var dataArray = interfacesStored[interface]
		dataArray.unshift(data)
		localStorage.set('interfacesStored', interfacesStored)
		$("#{}".format(interface)).JSONView(dataArray)
	})
}

function reloadInterfaces() {
	var localStorage = window.web_storage().localStorage
	var interfacesStored = localStorage.get('interfacesStored')
	if (interfacesStored) {
		for (var interface in interfacesStored) {
			$('#pushTable').bootstrapTable('append', {
				interface: interface,
				push: '<div class="input-div" id="{}"></div>'.format(interface)
			})
			interfacesStored[interface] = []
			listenInterface(interface)
		}
		localStorage.set('interfacesStored', interfacesStored)
	}
}

function reloadRequestInterfaces() {
	var localStorage = window.web_storage().localStorage
	var requestInterfacesStored = localStorage.get('requestInterfacesStored')
	if (requestInterfacesStored) {
		if ('game.gameHandler.enterGame' in requestInterfacesStored) {
			$('#inputInterface').attr('value', 'game.gameHandler.enterGame')
		}
		for (var interface in requestInterfacesStored) {
			$('#select-interface').append('<option value={}>{}</option>'.format(interface, interface))
		}
		$('#select-interface').selectpicker('refresh');
	}
}

function requestInterface(interface, obj) {
	pomelo.request(interface, obj, function(data) {
		console.debug('receive response,interface is:{}'.format(interface))
		$("#outputResponse").JSONView(data);
	})
}

$(document).ready(function() {
	var format = window.string_format
	format.extend(String.prototype)
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
	reloadInterfaces()
	reloadRequestInterfaces()
	$('#goButton').click(function() {
		$("#outputResponse").JSONView({});
		console.log('go button is pressed')
		var interface = $('#inputInterface').val()
		var request = $('#inputRequest').val()
		var isNotify = $('input[name="isNotify"]').is(':checked')

		if (!interface) {
			return console.log('interface is empty')
		}

		var requestInterfacesStored = localStorage.get('requestInterfacesStored') || {}
		console.log(requestInterfacesStored[interface])

		if (!(interface in requestInterfacesStored)) {
			requestInterfacesStored[interface] = request
			localStorage.set('requestInterfacesStored', requestInterfacesStored)
			$('#select-interface').append('<option value={}>{}</option>'.format(interface, interface))
			$('#select-interface').selectpicker('refresh');
		}
		console.log(interface)
		console.log(request)
		console.log(isNotify)
		var obj = eval('(' + '{' + request + '}' + ')');

		console.log(obj)
		if (!isNotify) {
			requestInterface(interface, obj)
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

		if (!interface) {
			return console.log('interface is empty')
		}

		var interfacesStored = localStorage.get('interfacesStored') || {}
		console.log(interfacesStored)
		if (interfacesStored[interface]) {
			return console.log('interface is already exist')
		}
		interfacesStored[interface] = []
		localStorage.set('interfacesStored', interfacesStored)
		listenInterface(interface)
		$('#pushTable').bootstrapTable('append', {
			interface: interface,
			push: '<div class="input-div" id="{}"></div>'.format(interface)
		})
	})
	$('#collapse-btn-push').on('click', function() {
		var interfacesStored = localStorage.get('interfacesStored') || {}
		for (var interface in interfacesStored) {
			$("#{}".format(interface)).JSONView('collapse')
		}
	});
	$('#expand-btn-push').on('click', function() {
		var interfacesStored = localStorage.get('interfacesStored') || {}
		for (var interface in interfacesStored) {
			$("#{}".format(interface)).JSONView('expand')
		}
	});
	$('#rm-interface').click(function() {
		console.log('rm-interface button click')
		var interface = $('#select-interface').find("option:selected").val()
		console.log('remove interface:{}'.format(interface))

		var requestInterfacesStored = localStorage.get('requestInterfacesStored')
		if (requestInterfacesStored) {
			delete requestInterfacesStored[interface]
			localStorage.set('requestInterfacesStored', requestInterfacesStored)
		}

		$('#select-interface').find('[value="{}"]'.format(interface)).remove();
		$('#select-interface').selectpicker('refresh');
	});
	$('#select-interface').on('change', function() {
		var interface = $(this).find("option:selected").val();
		console.log(interface);
		var requestInterfacesStored = localStorage.get('requestInterfacesStored')
		if (requestInterfacesStored) {
			console.log('update interface and request')
			param = requestInterfacesStored[interface]
			$('#inputInterface').attr('value', interface)
			$('#inputRequest').attr('value', param)
		}
	});
});