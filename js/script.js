$(document).ready(function(){
	$('.modal').modal();
});

var mobile = screen.width < 800;
var follow = false;
var lastPosition = null;
var observationProperties = {};

var themes = (() => {
	var json = null;
	$.ajax({
		'async': false,
		'global': false,
		'url': '/rest/api/config/',
		'dataType': 'json',
		'success': data => json = data
	});
	var themes = {};
	var colors = ["red", "yellow darken-1", "green", "blue"];
	for (theme in json) {
		$("#fab ul").append("<li><a href='#bottom-sheet' class='btn-floating " + colors[theme] + " waves-effect waves-light modal-trigger tooltipped' data-position='left' data-delay='50' data-tooltip='" + json[theme].name + "' onclick='loadToBottomSheet(themes, &quot;" + json[theme].name + "&quot;);displayTooltips();$(&quot;.fixed-action-btn&quot;).closeFAB();'><i class='material-icons'>opacity</i></a></li>");
		themes[json[theme].name] = json[theme];
	};
	return themes;
})();

var config = (() => {
	var json = null;
	$.ajax({
		'async': false,
		'global': false,
		'url': '/rest/api/config/',
		'dataType': 'json',
		'success': data => json = data
	});
	return json;
})();

var map = L.map('map', {
	center: [49.2, 16.6],
	zoom: 13,
	zoomControl: false
});

var positionFeature = L.circleMarker([0, 0], {
	color: '#1A8ACB',
	radius: 8,
	fillOpacity: 0.8,
	clickable: false
});
	
var accuracyFeature = L.circle([0, 0], 0, {
	color: '#93D9EC',
	fillOpacity: 0.4,
	weight: 2,
	clickable: false
});

L.tileLayer(mobile ? 'http://{s}.osm.rrze.fau.de/osmhd/{z}/{x}/{y}.png' : 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
var observationsLayer = L.geoJSON().addTo(map);

observationsLayer.addData(function() {
	var json = null;
	$.ajax({
		'async': false,
		'global': false,
		'url': '/rest/api/observations',
		'dataType': 'json',
		'success': (data) => json = data
	});
	return json;
}());

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

function loadToBottomSheet(template, label) {


	if (!label) {
		$('#bottom-sheet').load("templates/" + template, () => {
			$('select').material_select();
		});
		return;
	}

	let time = new Date();
	observationProperties = {
		// position: lastPosition,
		geometry: "POINT(" + lastPosition.lng + " " + lastPosition.lat + ")",
		observation_time: time.toLocaleTimeString(),
		date: time.toLocaleDateString().replace(/. /g, "-"),
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
	var observationTemplate = $("<div/>", {
		class: "modal-content"
	}).append([
		$("<a/>", {
			id: "modalHelp",
			href: "#hint",
			class: "waves-effect waves-light modal-trigger",
			html: "<i class='material-icons'>help</i></a>"
		}),
		"<h4>Dry vegetation (trees)</h4>",
		"<br>",
		observationForm
	]);
	$('#bottom-sheet').html(observationTemplate);
	(() => {
		$('select').material_select();
		// fillLatLng(lastPosition);
	})();
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
			// parameter: parameter.id,
			parameter: parseInt(Math.random()*10),
			value: property.value,
			phenomenon: phenomenonId
		}
	});
	return properties;
}

function sendObservation(e) {
	e.preventDefault();
	observationProperties.values = getFormData($("#observation"));
	$.post("/rest/api/observations/", JSON.stringify(observationProperties), (data, status) => console.log(status, data));
}