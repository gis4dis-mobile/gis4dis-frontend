var mobile = screen.width < 800;

var map = L.map('map').setView([49.2, 16.6], 13);

L.tileLayer(mobile ? 'http://{s}.osm.rrze.fau.de/osmhd/{z}/{x}/{y}.png' : 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);