$(document).ready(function(){
	$('.modal').modal();
});

let mobile = screen.width < 800;
let follow = false;
let lastPosition = null;
let observationProperties = {};

let themes = (() => {
	let json = null;
	$.ajax({
		'async': false,
		'global': false,
		'url': 'https://zelda.sci.muni.cz/rest/api/config/',
		'dataType': 'json',
		'success': data => json = data
	});
	let themes = {};
	let colors = ["red", "yellow darken-1", "green", "blue"];
	for (theme in json) {
		$("#fab ul").append("<li><a href='#bottom-sheet' class='btn-floating " + colors[theme] + " waves-effect waves-light modal-trigger tooltipped' data-position='left' data-delay='50' data-tooltip='" + json[theme].name + "' onclick='loadToBottomSheet(themes, &quot;" + json[theme].name + "&quot;);displayTooltips();$(&quot;.fixed-action-btn&quot;).closeFAB();'><i class='material-icons'>opacity</i></a></li>");
		themes[json[theme].name] = json[theme];
	};
	return themes;
})();

let config = (() => {
	let json = null;
	$.ajax({
		'async': false,
		'global': false,
		'url': 'https://zelda.sci.muni.cz/rest/api/config/',
		'dataType': 'json',
		'success': data => json = data
	});
	return json;
})();

let map = L.map('map', {
	center: [49.2, 16.6],
	zoom: 13,
	zoomControl: false
});

let positionFeature = L.circleMarker([0, 0], {
	color: '#1A8ACB',
	radius: 8,
	fillOpacity: 0.8,
	clickable: false
});
	
let accuracyFeature = L.circle([0, 0], 0, {
	color: '#93D9EC',
	fillOpacity: 0.4,
	weight: 2,
	clickable: false
});

L.tileLayer(mobile ? 'http://{s}.osm.rrze.fau.de/osmhd/{z}/{x}/{y}.png' : 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let observationsLayer = L.geoJSON().addTo(map);

observationsLayer.addData(() => {
	let json = null;
	$.ajax({
		'async': false,
		'global': false,
		'url': 'https://zelda.sci.muni.cz/rest/api/observations/',
		'dataType': 'json',
		'success': (data) => json = data
	});
	return json;
}());

function displayError(err) {
	console.log(err);
	$('#error .modal-content ul').remove();
	$('#error .modal-content').html("<h4 style='color:red'>Error</h4>");
	$('#error .modal-content').append("<ul></ul>")
	for (a in err) {
		for (b in err[a]) $('#error .modal-content ul').append("<li>" + err[a][b] + "</li>");;
	}
	$('#error').modal('open');
}

function userInfo() {
	if (!localStorage.userToken) {
		loadToBottomSheet('login.html');
		return;
	}
	loadToBottomSheet('account.html', null, () => $("#user-email").html(localStorage.email));
}

function login() {
	let formData = {};
	$("#login").serializeArray().map(input => formData[input.name] = input.value);
	$.ajax({
		'async': false,
		'global': false,
		'method': 'POST',
		'url': 'https://zelda.sci.muni.cz/rest/rest-auth/login/',
		'contentType': 'application/json; charset=UTF-8',
		'data': JSON.stringify(formData),
		'success': (data) => {
			localStorage.email = formData.email;
			localStorage.userToken = data.key;
			$("#bottom-sheet").modal("close");
			Materialize.toast('Login successful.', 4000);
		},
		'error': (data) => displayError(data.responseJSON)
	});
	console.log(localStorage.userToken);
}

function logout() {
	delete localStorage.email;
	delete localStorage.userToken;
	$("#bottom-sheet").modal("close");
	Materialize.toast('Logout successful.', 4000);
}

function registration() {
	let formData = {};
	$("#registration").serializeArray().map(input => {if (input.value) {formData[input.name] = input.value}});
	$.ajax({
		'async': false,
		'global': false,
		'method': 'POST',
		'url': 'https://zelda.sci.muni.cz/rest/rest-auth/registration/',
		'contentType': 'application/json; charset=UTF-8',
		'data': JSON.stringify(formData),
		'success': (data) => {
			localStorage.email = formData.email;
			localStorage.userToken = data.key;
			$("#bottom-sheet").modal("close");
			Materialize.toast('Registration successful.', 4000);
		},
		'error': (data) => displayError(data.responseJSON)
	});
	console.log(localStorage.userToken);
}

function toggleFollow(event) {
	if (follow) {
		map.off("dragstart", toggleFollow);
		$("#geolocationSwitch i").html("location_searching");
	} else {
		map.panTo(lastPosition);
		map.on("dragstart", toggleFollow);
		$("#geolocationSwitch i").html("my_location");
	}
	follow = !follow;
}

function locationSuccess(e) {
	if (follow) {
		map.panTo(e.latlng);
	}
	lastPosition = e.latlng;
	positionFeature.setLatLng(e.latlng);
	accuracyFeature.setLatLng(e.latlng);
	accuracyFeature.setRadius(e.accuracy/2);
	fillLatLng(e.latlng);
}

function fillLatLng(pos) {
	if (document.getElementById('latitude') || document.getElementById('longitude')) {
		$('#latitude')[0].value = pos.lat;
		$('#longitude')[0].value = pos.lng;
	}
}

map.on('locationfound', locationSuccess);
map.on('locationerror', () => {
	$("#geolocationSwitch i").html("location_disabled");
});
map.locate({
	watch: true,
	enableHighAccuracy: true
});
accuracyFeature.addTo(map);
positionFeature.addTo(map);

function loadToBottomSheet(template, label, callback) {
	if (!label) {
		$('#bottom-sheet').load("templates/" + template, () => {
			$('select').material_select();
			if (callback) callback();
		});
		return;
	}

	let time = new Date();
	observationProperties = {
		// position: lastPosition,
		geometry: "POINT(" + lastPosition.lng + " " + lastPosition.lat + ")",
		observation_time: ("0" + time.getHours()).substr(-2) + ":" + ("0" + time.getMinutes()).substr(-2) + ":" + ("0" + time.getSeconds()).substr(-2),
		date: time.getFullYear() + "-" + ("0" + (time.getMonth() + 1)).substr(-2) + "-" + ("0" + time.getDate()).substr(-2),
		values: []
	};
	let theme = template[label];
	let observationForm = $("<form/>", {
		id: "observation",
		name: theme.name,
		action: "",
		method: "GET",
		onsubmit: "sendObservation(event); return false;"
		// action: "api/observations/",
		// method: "POST",
		// enctype: "multipart/form-data"
	});
	for (parameter in theme.parameters) {
		let idName = theme.parameters[parameter].name.toLowerCase().replace(/ /g, "-");
		switch (theme.parameters[parameter].element) {
			case "select":
				let parameterOptions = [$("<option/>", {
					value: "",
					disabled: true,
					selected: true,
					text: "Choose an option"
				})];
				let options = theme.parameters[parameter].options
				for (option in options) {
					parameterOptions.push($("<option/>", {
						value: options[option].value,
						text: options[option].value
					}))
				};
				observationForm.append($("<div/>", {
					class: "input-field"
				}).append($("<select/>", {
					name: theme.parameters[parameter].name
				}).append(parameterOptions), "<label>" + theme.parameters[parameter].name + "</label>"));
				break;
			case "input":
				let type, step;
				switch (theme.parameters[parameter].type) {
					case "float":
						type = "number";
						step = 0.01;
						break;
					case "integer":
						type = "number";
						step = 1;
						break;
					case "string":
						type = "text";
						delete step;
						break;
				};
				observationForm.append($("<div/>", {
					class: "input-field"
				}).append($("<input/>", {
					id: idName,
					name: theme.parameters[parameter].name,
					type: type,
					step: step ? step : undefined,
					class: "validate"
				}), "<label for='" + idName + "''>" + theme.parameters[parameter].name + "</label>"));
				break;
		};
	};
	observationForm.append(/*$("<div/>", {
		class: "input-field"
	}).append($("<input/>", {
		id: "latitude",
		name: "latitude",
		type: "number",
		step: "any",
		style: "display: none;"
	})), $("<div/>", {
		class: "input-field"
	}).append($("<input/>", {
		id: "longitude",
		name: "longitude",
		type: "number",
		step: "any",
		style: "display: none;"
	})), */$("<button/>", {
		class: "btn waves-effect waves-light",
		type: "submit",
		name: "submit",
		text: "Submit"
	}).append($("<i/>", {
		class: "material-icons right",
		text: "send"
	})));
	let observationTemplate = $("<div/>", {
		class: "modal-content"
	}).append([
		$("<a/>", {
			id: "modalHelp",
			href: "#hint",
			class: "waves-effect waves-light modal-trigger",
			html: "<i class='material-icons'>help</i></a>"
		}),
		"<h4>" + theme.name + "</h4>",
		"<br>",
		observationForm
	]);
	$('#bottom-sheet').html(observationTemplate);
	(() => {
		$('select').material_select();
		// fillLatLng(lastPosition);
	})();

	if (callback) callback();
	// return;
}

function showHint(hint) {
	$('#hint .modal-content').html("<h4>" + hint[0].name + "</h4>");
	$('#hint .modal-content').append(hint[0].text);
}

function displayTooltips() {
	if (!$("#fab").hasClass("active")) {
		tooltipsDelay = setTimeout(() => {
			$(".tooltipped").trigger("mouseenter.tooltip");
			tooltipsDelay = setTimeout(() => {$(".tooltipped").trigger("mouseleave.tooltip");}, 3000);
		}, 500);
	} else {
		$(".tooltipped").trigger("mouseleave.tooltip");
		clearTimeout(tooltipsDelay);
	}
}

function getFormData($form) {
	let rawProperties = $form.serializeArray();	
	// let phenomenonId = themes[$form[0].name];
	let phenomenonId = 1;
	let properties = rawProperties.map(property => {
		let parameter = themes[$form[0].name].parameters.find(parameter => parameter.name == property.name);
		return {
			parameter: parameter.id,
			// parameter: parseInt(Math.random()*10),
			value: property.value,
			phenomenon: phenomenonId
		}
	});
	return properties;
}

function sendObservation(e) {
	e.preventDefault();
	observationProperties.values = getFormData($("#observation"));
	$.ajax({
		'async': false,
		'global': false,
		'method': 'POST',
		'url': 'https://zelda.sci.muni.cz/rest/api/observations/',
		'contentType': 'application/json; charset=UTF-8',
		'data': JSON.stringify(observationProperties),
		'success': (data, status) => {
			console.log(status, data);
			$("#bottom-sheet").modal("close");
			Materialize.toast('Observation sent.', 4000);
			observationsLayer.addData(data);
		},
		'error': (error) => console.log(error)
	});
}