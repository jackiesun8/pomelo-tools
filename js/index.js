$(document).ready(function() {
	console.log('the document index is ready now')
	var pomelo = window.pomelo
	var browser_http = widnow.browser_http
	console.log(pomelo)
	console.log(browser_http)
	$('#loginButton').click(function() {
		var username = $('#inputUserName').val();
		var password = $('#inputPassword').val();
		var login_address_port = $('#inputLogin').val();
		var gate_address_port = $('#inputGate').val();
		if (!username | !password | !login_address_port | !gate_address_port) {

		}
	})
});