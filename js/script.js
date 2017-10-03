var mobile = screen.width < 800;

var map = L.map('map', {
	center: [49.2, 16.6],
	zoom: 13,
	zoomControl: false
});

L.tileLayer(mobile ? 'http://{s}.osm.rrze.fau.de/osmhd/{z}/{x}/{y}.png' : 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

$(document).ready(function(){
	$('#bottom-sheet').modal();
})

function loadToBottomSheet(template) {
	$('#bottom-sheet').load("templates/" + template);
}