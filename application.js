let client;
let marker = null;

const connectBtn = document.getElementById('connectBtn');
const publishBtn = document.getElementById('publishBtn');
const geoBtn = document.getElementById('geoBtn');
const status = document.getElementById('status');
const topicInput = document.getElementById('topic');
const msgInput = document.getElementById('msg');
const consoleDiv = document.getElementById('console');

let map = L.map('map').setView([51.05, -114.07], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function log(text) {
    consoleDiv.innerHTML += `<p>${text}</p>`;
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

function updateMarker(lat, lon, temp) {
    if (marker) map.removeLayer(marker);
    let color = temp < 10 ? 'blue' : temp < 30 ? 'green' : 'red';
    let icon = L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    marker = L.marker([lat, lon], { icon }).addTo(map)
        .bindPopup(`Temperature: ${temp}°C`).openPopup();
    map.setView([lat, lon], 15);
}

connectBtn.onclick = () => {
    const host = document.getElementById('host').value;
    const port = parseInt(document.getElementById('port').value);
    client = new Paho.MQTT.Client(host, port, "client-" + Math.random());

    client.onConnectionLost = (res) => log("Connection lost.");
    client.onMessageArrived = (msg) => {
        log(`Received: ${msg.payloadString}`);
        try {
            const data = JSON.parse(msg.payloadString);
            if (data.geometry && data.properties) {
                updateMarker(data.geometry.coordinates[1], data.geometry.coordinates[0], data.properties.temperature);
            }
        } catch (e) {
            log("Invalid GeoJSON format.");
        }
    };

    client.connect({
        onSuccess: () => {
            log("Connected to broker.");
            status.textContent = "Status: Connected";
            publishBtn.disabled = false;
            geoBtn.disabled = false;
            client.subscribe(topicInput.value);
        },
        onFailure: () => {
            log("Connection failed.");
            status.textContent = "Status: Failed";
        }
    });
};

publishBtn.onclick = () => {
    const topic = topicInput.value;
    const message = new Paho.MQTT.Message(msgInput.value);
    message.destinationName = topic;
    client.send(message);
    log(`Sent: ${msgInput.value}`);
    msgInput.value = '';
};

geoBtn.onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const temp = Math.floor(Math.random() * 100 - 40);
        const geojson = JSON.stringify({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: { temperature: temp }
        });
        const message = new Paho.MQTT.Message(geojson);
        message.destinationName = topicInput.value;
        client.send(message);
        updateMarker(lat, lon, temp);
        log(`Shared location with temp: ${temp}`);
    }, err => {
        log("Geolocation error: " + err.message);
    });
};
