$(document).ready(function(){
	$('.modal').modal();
});

let checkConnection;
let follow = false;
let lastPosition = null;
let observationProperties = {};
let observationPhotos = [];

if (!localStorage.observations) {
	localStorage.observations = JSON.stringify([]);
} else if (!Array.isArray(JSON.parse(localStorage.observations))) {
	localStorage.observations = JSON.stringify([]);
} else {
	if (JSON.parse(localStorage.observations).length > 0) {
		retrySending();
	}
}

function checkStatus(response) {
  if (response.ok) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function fetchData(url) {
	return fetch(url, {
		headers: {
			Authorization: localStorage.userToken ? "Token " + localStorage.userToken : undefined,
		},
	})
}

function parseThemes(data) {
	let tempThemes = {};
	const colors = ["red", "yellow darken-1", "green", "blue"];
	for (theme in data) {
		$("#fab ul").append(`<li><a href='#bottom-sheet' class='btn-floating ${colors[theme]} waves-effect waves-light modal-trigger tooltipped' data-position='left' data-delay='50' data-args="${data[theme].i18n_tag}" data-tooltip='${$.i18n(data[theme].i18n_tag)}' onclick='loadToBottomSheet(themes, "${data[theme].name}");displayTooltips();$(".fixed-action-btn").closeFAB();'><i class='material-icons'>opacity</i></a></li>`);
		// $("#fab ul").append("<li><a href='#bottom-sheet' class='btn-floating " + colors[theme] + " waves-effect waves-light modal-trigger tooltipped' data-position='left' data-delay='50' data-tooltip='" + data[theme].name + "' onclick='loadToBottomSheet(themes, &quot;" + data[theme].name + "&quot;);displayTooltips();$(&quot;.fixed-action-btn&quot;).closeFAB();'><i class='material-icons'>opacity</i></a></li>");
		tempThemes[data[theme].name] = data[theme];
	};
	themes = tempThemes;
}

function parseLocalization(loc) {
	return loc.reduce((acc, curr) => {
		for (l in curr) {
			if (l in acc) {
				Object.assign(acc[l], curr[l]);
      } else {
				acc[l] = curr[l]
			}
		}
		return acc
	}, {});
}

function setLanguageTo(lang) {
	$.i18n().locale = lang;
	translate();
}

function translate() {
  $('.translate').each((i, el) => {
    let args = [];
    $this = $(el);
    if ($this.data('args')) args = $this.data('args').split(',');
    $this.html( $.i18n.apply(null, args) );
  });
	$(".tooltipped").each((i, el) => {
    let args = [];
    $this = $(el);
    if ($this.data('args')) args = $this.data('args').split(',');
    $this.attr("data-tooltip", $.i18n.apply(null, args) );
	});
	$('.tooltipped').tooltip({delay: 50});
}

let localizationUpdated = false;
let localization;
let updateLocalization = fetchData('https://zelda.sci.muni.cz/rest/api/localization/')
	.then(response => response.json())
	.then(data => localization = parseLocalization(data))
	.catch(data => displayError(data))
	.then(data => {
		localizationUpdated = true;
		$.i18n().load(localization).done( function() { console.log('done!') } );
		$.i18n().locale = "en";
		$( document ).ready(function() {
			setLanguageTo("en");
			console.log($.i18n('g4d-title'));
		});
	})

caches.match('https://zelda.sci.muni.cz/rest/api/localization/').then(function(response) {
  if (!response) throw Error("No data");
  return response.json();
}).then(function(data) {
  if (!localizationUpdated) {
  }
}).catch(function() {
  return updateLocalization;
}).catch(error => console.log(`Fetching localization failed with ${error}`));

let configUpdated = false;
let config;
let themes;
let updateConfig = fetchData('https://zelda.sci.muni.cz/rest/api/config/')
	.then(response => response.json())
	.then(data => config = data)
	.catch(data => displayError(data))
	.then(data => {
		configUpdated = true;
		$(document).ready(() => {
			parseThemes(data);
			$('.tooltipped').tooltip({delay: 50});
		});
	})

caches.match('https://zelda.sci.muni.cz/rest/api/config/').then(function(response) {
  if (!response) throw Error("No data");
  return response.json();
}).then(function(data) {
  if (!configUpdated) {
    parseThemes(data);
  }
}).catch(function() {
  return updateConfig;
}).catch(error => console.log(`Fetching config failed with ${error}`));

const map = L.map('map', {
	center: [49.2, 16.6],
	zoom: 13,
	zoomControl: false
});

const positionFeature = L.circleMarker([0, 0], {
	color: '#1A8ACB',
	radius: 8,
	fillOpacity: 0.8,
	clickable: false
});
	
const accuracyFeature = L.circle([0, 0], 0, {
	color: '#93D9EC',
	fillOpacity: 0.4,
	weight: 2,
	clickable: false
});

L.tileLayer(devicePixelRatio > 1 ? 'https://{s}.osm.rrze.fau.de/osmhd/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let observationsLayer = L.geoJSON([], {
	onEachFeature: onEachMarker,
}).addTo(map);
observationsLayer.on("popupopen", () => translate());

function onEachMarker(feature, layer) {
	const phenomenon = feature.properties.values[0].phenomenon;
	// let popupContent = `<span class="heading">${feature.properties.values[0].phenomenon}</span><br><span>submitted by ${feature.properties.user} ${getTimeDelta(feature.properties.observation_date)}</span><br>`;
	let popupContent = `<span class="heading translate" data-args="${phenomenon.i18n_tag}">${phenomenon.name}</span><br><span class="translate" data-args="${getTimeDelta(feature.properties.observation_date)[1]},${getTimeDelta(feature.properties.observation_date)[0]}">${getTimeDelta(feature.properties.observation_date)[2]}</span><br>`;

	for (val in feature.properties.values) {
		const value = feature.properties.values[val];
		popupContent += `<br><b class="translate" data-args="${value.parameter.i18n_tag}">${value.parameter.name}:</b> <span ${typeof(value.value) === "object" ? "i18n_tag" in value.value ? `class="translate" data-args="${value.value.i18n_tag}"` : `` : ``}>${typeof(value.value) === "object" ? value.value.value : value.value}</span>`;
	}

	if (!!feature.properties.photos) {
		if (feature.properties.photos.length > 0) popupContent += `<br><span class="translate" data-args="g4d-info-photocount,${feature.properties.photos.length}">${feature.properties.photos.length} photo${feature.properties.photos.length > 1 ? "s" : ""} available</span>`;
	}

	popupContent += `<br><div class="footer"><a class="waves-effect waves-light btn-flat modal-trigger translate" data-args="g4d-info-more" href="#feature-info" onclick="fillFeatureInfo(${feature.id});">More info</a></div>`;

	layer.bindPopup(popupContent);
}

let observationsUpdated = false;
let observations;
let updateObservations = fetchData('https://zelda.sci.muni.cz/rest/api/observations/')
	.then(response => response.json())
	.then(data => observations = data)
	.catch(error => console.log(`Fetching observations failed with ${error}`))
	.then(data => {
		observationsUpdated = true;
		observationsLayer.addData(data)
	})

caches.match('https://zelda.sci.muni.cz/rest/api/observations/').then(function(response) {
  if (!response) throw Error("No data");
  return response.json();
}).then(function(data) {
  if (!observationsUpdated) {
    observationsLayer.addData(data);
  }
}).catch(function() {
  return updateObservations;
}).catch(error => console.log(`Fetching observations failed with ${error}`));

// (() => {
// 	$.ajax({
// 		async: false,
// 		global: false,
// 		headers: {
// 			'Authorization': localStorage.userToken ? "Token " + localStorage.userToken : undefined,
// 		},
// 		url: 'https://zelda.sci.muni.cz/rest/api/observations/',
// 		dataType: 'json',
// 		success: (data) => observations = data
// 	});
// })()

function getTimeDelta(t1, t2 = Date.now()) {
	if (typeof(t1) === "string") t1 = Date.parse(t1);
	if (typeof(t2) === "string") t2 = Date.parse(t2);

	const d = t2 - t1;
	const dY = d/1000/60/60/24/365;
	const dM = d/1000/60/60/24/30.5;
	const dW = d/1000/60/60/24/7;
	const dD = d/1000/60/60/24;
	const dh = d/1000/60/60;
	const dm = d/1000/60;
	const ds = d/1000;

	if (dY > 1) {
		return [Math.floor(dY), "g4d-info-yearago" ,`${Math.floor(dY)} year${Math.floor(dY) < 2 ? "" : "s"} ago`];
	}
	if (dM > 1) {
		return [Math.floor(dM), "g4d-info-monthago" ,`${Math.floor(dM)} month${Math.floor(dM) < 2 ? "" : "s"} ago`];
	}
	if (dW > 1) {
		return [Math.floor(dW), "g4d-info-weekago" ,`${Math.floor(dW)} week${Math.floor(dW) < 2 ? "" : "s"} ago`];
	}
	if (dD > 1) {
		return [Math.floor(dD), "g4d-info-dayago" ,`${Math.floor(dD)} day${Math.floor(dD) < 2 ? "" : "s"} ago`];
	}
	if (dh > 1) {
		return [Math.floor(dh), "g4d-info-hourago" ,`${Math.floor(dh)} hour${Math.floor(dh) < 2 ? "" : "s"} ago`];
	}
	if (dm > 1) {
		return [Math.floor(dm), "g4d-info-minuteago" ,`${Math.floor(dm)} minute${Math.floor(dm) < 2 ? "" : "s"} ago`];
	}
	else {
		return [Math.floor(ds), "g4d-info-secondago" ,`${Math.floor(ds)} second${Math.floor(ds) < 2 ? "" : "s"} ago`];
	}
}

function fillFeatureInfo(id) {
	const properties = observations.features.find(x => x.id === id).properties;
	const phenomenon = properties.values[0].phenomenon;
	const d = new Date(properties.observation_date);
	// modalContent.html(`<span class="heading">${properties.values[0].phenomenon}</span><br><span>submitted by ${properties.user} on ${d.toLocaleDateString()}, ${d.toLocaleTimeString()}</span><br>`);
	let modalContent = $("#feature-info .modal-content");
	modalContent.html(`<span class="heading translate" data-args="${phenomenon.i18n_tag}">${phenomenon.name}</span><br><span class="translate" data-args="g4d-info-submitted-on,${d.toLocaleDateString()},${d.toLocaleTimeString()}">submitted on ${d.toLocaleDateString()}, ${d.toLocaleTimeString()}</span><br>`);

	for (value in properties.values) {
		const v = properties.values[value];
		modalContent.append(`<br><b class="translate" data-args="${v.parameter.i18n_tag}">${v.parameter.name}:</b> <span ${typeof(v.value) === "object" ? "i18n_tag" in v.value ? `class="translate" data-args="${v.value.i18n_tag}"` : `` : ``}>${typeof(v.value) === "object" ? v.value.value : v.value}</span>`);
	}

	if (!!properties.photos) {
		if (properties.photos.length > 0) {
			let carousel = $("<div class='carousel carousel-slider center' data-indicators='true'/>");

			for (photo in properties.photos) {
				const p = properties.photos[photo];
				carousel.append(`<a class="carousel-item"><img src="https://zelda.sci.muni.cz${p.image}"></a>`);
			}

			modalContent.append(carousel);

			$('.carousel').carousel({
				fullWidth: true,
				duration: 100,
				shift: 100,
				padding: 100,
			});
		}
	}

	$("#feature-info.modal").modal({
		startingTop: '10%',
		endingTop: '10%',
		ready: function() {
			let minHeight = 9999;

			$("#feature-info .carousel img").each(function(index) {
				minHeight = $(this).height() < minHeight ? $(this).height() : minHeight;
			});

			$("#feature-info .carousel").height(minHeight);
			translate();
		},
		complete: function() {
			$("#feature-info .modal-content").html("");
			delete modalContent;
		},
	})
}

function displayError(err) {
	console.log(err);
	$('#error .modal-content ul').remove();
	$('#error .modal-content').html("<h4 style='color:red'>Error</h4>");
	$('#error .modal-content').append("<ul></ul>")
	for (a in err) {
		for (b in err[a]) $('#error .modal-content ul').append("<li>" + err[a][b] + "</li>");
	}
	$('#error').modal({
		ready: () => translate(),
	});
	$('#error').modal('open');
}

function userInfo() {
	if (!localStorage.userToken) {
		loadToBottomSheet('login.html');
		return;
	}
	loadToBottomSheet('account.html', null, () => $("#user-email").html(localStorage.email));
}

function googleLogin(token, email) {
    $.ajax({
        async: false,
        global: false,
        method: 'POST',
        url: 'https://zelda.sci.muni.cz/rest/rest-auth/google/',
        contentType: 'application/json; charset=UTF-8',
        data: {'access_token': token},
        success: (data) => {
            localStorage.email = email;
            localStorage.userToken = data.key;
            $("#bottom-sheet").modal("close");
            Materialize.toast($.i18n("g4d-toast-loginsuccessful"), 4000);
        },
        error: (data) => displayError(data.responseJSON)
    });
}

function facebookLogin(token) {
    $.ajax({
        async: false,
        global: false,
        method: 'POST',
        url: 'https://zelda.sci.muni.cz/rest/rest-auth/facebook/',
        contentType: 'application/json; charset=UTF-8',
        data: {'access_token': token},
        success: (data) => {
            //localStorage.email = formData.email;
            localStorage.userToken = data.key;
            $("#bottom-sheet").modal("close");
            Materialize.toast($.i18n("g4d-toast-loginsuccessful"), 4000);
        },
        error: (data) => displayError(data.responseJSON)
    });
}

function login() {
	let formData = {};
	$("#login").serializeArray().map(input => formData[input.name] = input.value);
	$.ajax({
		async: false,
		global: false,
		method: 'POST',
		url: 'https://zelda.sci.muni.cz/rest/rest-auth/login/',
		contentType: 'application/json; charset=UTF-8',
		data: JSON.stringify(formData),
		success: (data) => {
			localStorage.email = formData.email;
			localStorage.userToken = data.key;
			$("#bottom-sheet").modal("close");
			Materialize.toast($.i18n("g4d-toast-loginsuccessful"), 4000);
			if (JSON.parse(localStorage.observations).length > 0) {
				retrySending();
			}
		},
		error: (data) => displayError(data.responseJSON)
	});
	console.log(localStorage.userToken);
}

function logout() {
	delete localStorage.email;
	delete localStorage.userToken;
	$("#bottom-sheet").modal("close");
	Materialize.toast($.i18n("g4d-toast-logoutsuccessful"), 4000);
}

function registration() {
	let formData = {};
	$("#registration").serializeArray().map(input => {if (input.value) {formData[input.name] = input.value}});
	$.ajax({
		async: false,
		global: false,
		method: 'POST',
		url: 'https://zelda.sci.muni.cz/rest/rest-auth/registration/',
		contentType: 'application/json; charset=UTF-8',
		data: JSON.stringify(formData),
		success: (data) => {
			localStorage.email = formData.email;
			localStorage.userToken = data.key;
			$("#bottom-sheet").modal("close");
			Materialize.toast($.i18n("g4d-toast-registrationsuccessful"), 4000);
		},
		error: (data) => displayError(data.responseJSON)
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
			translate();
		});
		return;
	}

	position = lastPosition ? lastPosition : map.getCenter()

	const time = new Date();
	observationProperties = {
		geometry: "POINT(" + position.lng + " " + position.lat + ")",
		observation_date: time.toISOString(),
		// observation_time: ("0" + time.getHours()).substr(-2) + ":" + ("0" + time.getMinutes()).substr(-2) + ":" + ("0" + time.getSeconds()).substr(-2),
		// date: time.getFullYear() + "-" + ("0" + (time.getMonth() + 1)).substr(-2) + "-" + ("0" + time.getDate()).substr(-2),
		values: []
	};
	observationPhotos = [];
	let theme = template[label];
	let observationForm = $("<form/>", {
		id: "observation",
		name: theme.name,
		action: "",
		method: "GET",
		onsubmit: "trySending(event); return false;"
		// action: "api/observations/",
		// method: "POST",
		// enctype: "multipart/form-data"
	});
	for (parameter in theme.parameters) {
		const idName = theme.parameters[parameter].name.toLowerCase().replace(/ /g, "-");
		switch (theme.parameters[parameter].element) {
			case "select":
				let parameterOptions = [$("<option/>", {
					value: "",
					disabled: true,
					selected: true,
					text: $.i18n("g4d-chooseoption")
				})];
				const options = theme.parameters[parameter].options
				for (option in options) {
					parameterOptions.push($("<option/>", {
						value: options[option].value,
						text: $.i18n(options[option].i18n_tag)
					}))
				};
				observationForm.append($("<div/>", {
					class: "input-field"
				}).append($("<select/>", {
					name: theme.parameters[parameter].name
				}).append(parameterOptions), `<label class="translate" data-args="${theme.parameters[parameter].i18n_tag}">${theme.parameters[parameter].name}</label>`));
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
				}), `<label for="${idName}" class="translate" data-args="${theme.parameters[parameter].i18n_tag}">${theme.parameters[parameter].name}</label>`));
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
	})), */
	$("<input/>", {
		type: "file",
		name: "photo",
		id: "photoInput",
		accept: "image/*",
		style: "display:none"
	}),
	$("<button/>", {
		id: "photo",
		name: "triggerPhoto",
		class: "btn waves-effect waves-light",
		onclick: "getImage('#photoInput', event);"
	}).append($("<i/>", {
		class: "material-icons",
		text: "add_a_photo"
	}))," ",
	$("<button/>", {
		class: "btn waves-effect waves-light translate",
		type: "submit",
		name: "submit",
		"data-args": "g4d-submit",
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
			html: "<i class='material-icons'>help</i></a>",
			onclick: showHint(themes[theme.name])
		}),
		`<h4 class="translate" data-args="${theme.i18n_tag}">${theme.name}</h4>`,
		"<br>",
		observationForm
	]);
	$('#bottom-sheet').html(observationTemplate);
	(() => {
		$('select').material_select();
		// fillLatLng(lastPosition);
	})();

	// $(".carousel").carousel();
	$("#photoInput").change(displayThumbnail);

	if (callback) callback();
	translate();
	// return;
}

function showHint(theme) {
	$('#hint .modal-content').html(`<h4>${$.i18n(theme.i18n_tag)}</h4>`);
	$('#hint .modal-content').append($.i18n(theme.help[0].i18n_tag));
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

function displayThumbnail() {
	let me = this;

	if (observationPhotos.length === 0) {
		$("<div/>", {
			id: "photoCarousel",
			class: "carousel carousel-slider center",
			"data-indicators": "true"
		}).insertBefore("form#observation input#photoInput");
	}

	let reader = new FileReader();
	reader.onload = function(e) {
		observationPhotos.push(e.target.result);

		$("#photoCarousel").append($("<a/>", {
			class: "carousel-item",
			href: "#" + me.files[0].name,
		}).append($("<img/>", {
			class: "thumbnail",
			src: e.target.result,
			alt: "Photo thumbail",
		})));	
		// $("#photoCarousel").css("display", "unset");
		$(".carousel").carousel('destroy');
		$(".carousel").carousel({
			fullWidth: true,
			duration: 100
		});
	};

	reader.readAsDataURL(me.files[0]);
}

function getFormData($form) {
	let rawProperties = $form.serializeArray();	
	let phenomenonId = themes[$form[0].name].id;
	let properties = rawProperties.map(property => {
		let parameter = themes[$form[0].name].parameters.find(parameter => parameter.name == property.name);
		return {
			parameter: parameter.id,
			value: property.value,
			phenomenon: phenomenonId
		}
	});
	return properties;
}

function getImage(id, e) {
	e.preventDefault();
	$(id).click();
}

function sendObservation(data, photos, successCallback, errorCallback) {
  let xhr = new XMLHttpRequest();

  let noResponseTimer = setTimeout(() => {
  	xhr.abort();
  	errorCallback(xhr.status);
  	return;
  }, 3000);

  xhr.onreadystatechange = function(e) {
    if (xhr.readyState !== 4) {
      return;
    }

    if (xhr.status === 201) {
    	clearTimeout(noResponseTimer);
    	sendPhotos(photos, (data, status) => {
				console.log(status);
				Materialize.toast($.i18n("g4d-toast-photosent"), 4000);
				// observationsLayer.addData(data);
			}, (error) => {
				console.log(error);
				Materialize.toast($.i18n("g4d-toast-photofailed"), 4000);
				// let observations = JSON.parse(localStorage.observations);
				// observations.push(observationProperties)
				// localStorage.observations = JSON.stringify(observations);
				// retrySending();
			});
      successCallback(JSON.parse(xhr.response), xhr.status);
    } else if (xhr.status === 401 && JSON.parse(xhr.response).detail === "Invalid token.") {
    	clearTimeout(noResponseTimer);
			$("#bottom-sheet").modal("close");
			if (localStorage.userToken === undefined) {
				Materialize.toast($(`<span>${$.i18n("g4d-toast-notsignedin")}</span>`).add($(`<a href="#bottom-sheet" class="btn-flat toast-action modal-trigger" onclick="userInfo()">${$.i18n("g4d-sign-in")}</a>`)), 4000);
			} else {
				Materialize.toast($(`<span>${$.i18n("g4d-toast-sessionexpired")}</span>`).add($(`<a href="#bottom-sheet" class="btn-flat toast-action modal-trigger" onclick="userInfo()">${$.i18n("g4d-sign-in")}</a>`)), 4000);
			}
    } else {
    	clearTimeout(noResponseTimer);
    	errorCallback(xhr.status);
    }
  };

  xhr.open("POST", 'https://zelda.sci.muni.cz/rest/api/observations/', true);
  xhr.setRequestHeader("Authorization", "Token " + localStorage.userToken);
  xhr.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
  xhr.send(data);
}

function sendPhotos(photos, successCallback, errorCallback) {
  let xhr = new XMLHttpRequest();

  let noResponseTimer = setTimeout(() => {
  	xhr.abort();
  	errorCallback(xhr.status);
  	return;
  }, 120000);

  xhr.onreadystatechange = function(e) {
    if (xhr.readyState != 4) {
      return;
    }

    if (xhr.status == 201) {
    	clearTimeout(noResponseTimer);
      successCallback(JSON.parse(xhr.response), xhr.status);
    } else {
    	errorCallback(xhr.status);
    }
  };

  xhr.open("POST", 'https://zelda.sci.muni.cz/rest/api/photos/', true);
  xhr.setRequestHeader("Authorization", "Token " + localStorage.userToken);
  // xhr.setRequestHeader("Content-type", undefined);
  // xhr.setRequestHeader("Content-type", 'multipart/form-data; charset=UTF-8');
  for (photo in photos) {
  	data = new FormData();
  	data.append("image", photos[photo]);
  	data.append("owner", 1);
  	data.append("parameter", 1);
  	data.append("phenomenon", 1);
  	xhr.send(data);
  }
}

function trySending(e) {
	e.preventDefault();
	observationProperties.values = getFormData($("#observation"));
	sendObservation(JSON.stringify(observationProperties), observationPhotos, (data, status) => {
		console.log(status);
		$("#bottom-sheet").modal("close");
		Materialize.toast($.i18n("g4d-toast-observationsent"), 4000);
		observationsLayer.addData(data);
	}, (error) => {
		console.log(error);
		$("#bottom-sheet").modal("close");
		Materialize.toast($.i18n("g4d-toast-datafailed-retry"), 4000);
		let observations = JSON.parse(localStorage.observations);
		observations.push(observationProperties)
		localStorage.observations = JSON.stringify(observations);
		retrySending();
	});
}

function retrySending() {
	if (typeof checkConnection !== "undefined") return;

	checkConnection = setTimeout(() => {
		let observations = JSON.parse(localStorage.observations);
		console.log('Trying to send observations.', observations);
		let sentCount = 0;

		function continueSending() {
			if (observations.length > 0) {
				observations = JSON.parse(localStorage.observations);
				let observation = observations[0];
				sendObservation(JSON.stringify(observation), [], (data,status) => {
					console.log(status);
					observationsLayer.addData(data);
					observations.splice(0,1);
					sentCount++;
					localStorage.observations = JSON.stringify(observations);
					continueSending();
				}, (error) => {
					checkConnection = undefined;
					retrySending();
					if (sentCount > 0) Materialize.toast($.i18n("g4d-toast-sent-n-observations", sentCount, observations.length), 4000);
				});
			}
			if (observations.length == 0) {
				checkConnection = undefined;
				Materialize.toast($.i18n("g4d-toast-sent-all-observations", sentCount), 4000);
			}
		}

		continueSending();
	}, 5000);
}