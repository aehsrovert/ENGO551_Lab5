// DOM Elements
const hostInput = document.getElementById('host');
const portInput = document.getElementById('port');
const clientIdInput = document.getElementById('clientId');
const connectBtn = document.getElementById('connectBtn');
const connectionStatus = document.getElementById('connectionStatus');
const topicInput = document.getElementById('topic');
const messageInput = document.getElementById('message');
const publishBtn = document.getElementById('publishBtn');
const shareStatusBtn = document.getElementById('shareStatusBtn');
const messagesDiv = document.getElementById('messages');

// Set random client ID
clientIdInput.value += Math.floor(Math.random() * 1000);

// MQTT and Map Variables
let mqttClient;
let isConnected = false;
let map;
let userMarker;

function initMap() {
    map = L.map('map').setView([51.05, -114.07], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
            },
            error => {
                addMessage('Error getting location: ' + error.message);
            }
        );
    } else {
        addMessage('Geolocation is not supported by your browser');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    // Set default topic
    if (!topicInput.value) {
        topicInput.value = 'ENGO551/your_name/my_temperature';
    }
});

// Connect button handler
connectBtn.addEventListener('click', () => {
    if (!isConnected) {
        // Connect
        const host = hostInput.value;
        const port = parseInt(portInput.value);
        const clientId = clientIdInput.value;

        // Disable inputs while connected
        hostInput.disabled = true;
        portInput.disabled = true;
        clientIdInput.disabled = true;

        connectMQTT(host, port, clientId);
    } else {
        // Disconnect
        if (mqttClient && mqttClient.isConnected()) {
            mqttClient.disconnect();
        }
        
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
        
        hostInput.disabled = false;
        portInput.disabled = false;
        clientIdInput.disabled = false;
        
        isConnected = false;
        connectBtn.textContent = 'Start Connection';
        connectionStatus.textContent = 'Status: Disconnected';
        connectionStatus.style.color = 'red';
        publishBtn.disabled = true;
        shareStatusBtn.disabled = true;
    }
});

// Connect to MQTT broker
function connectMQTT(host, port, clientId) {
    try {
        addMessage('Connecting to MQTT broker...');
        
        // Create MQTT client
        mqttClient = new Paho.MQTT.Client(host, port, clientId);
        
        // Set callback handlers
        mqttClient.onConnectionLost = onConnectionLost;
        mqttClient.onMessageArrived = onMessageArrived;
        
        // Connect options
        const options = {
            timeout: 3,
            onSuccess: onConnect,
            onFailure: onFailure
        };
        
        mqttClient.connect(options);
    } catch (error) {
        addMessage('Error creating MQTT client: ' + error.message);
    }
}

// Called when connected successfully
function onConnect() {
    isConnected = true;
    addMessage('Connected to MQTT broker!');
    connectionStatus.textContent = 'Status: Connected';
    connectionStatus.style.color = 'green';
    connectBtn.textContent = 'End Connection';
    publishBtn.disabled = false;
    shareStatusBtn.disabled = false;
    
    // Subscribe to topic
    const topic = topicInput.value;
    subscribeToTopic(topic);
}

// Called when connection fails
function onFailure(responseObject) {
    addMessage('Failed to connect: ' + responseObject.errorMessage);
    
    // Enable inputs again
    hostInput.disabled = false;
    portInput.disabled = false;
    clientIdInput.disabled = false;
    
    // alternate broker for mobile
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        addMessage('Mobile device detected. Trying alternate broker...');
        
        
        hostInput.value = "broker.emqx.io";
        portInput.value = "8083";
        
        
        setTimeout(() => {
            connectBtn.click();
        }, 1000);
    }
}

// Called when connection is lost
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        addMessage('Connection lost: ' + responseObject.errorMessage);
        connectionStatus.textContent = 'Status: Disconnected';
        connectionStatus.style.color = 'red';
        publishBtn.disabled = true;
        shareStatusBtn.disabled = true;
        
        setTimeout(() => {
            if (isConnected) {
                addMessage('Attempting to reconnect...');
                mqttClient.connect({
                    onSuccess: onConnect,
                    onFailure: onFailure
                });
            }
        }, 5000);
    }
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;
    
    addMessage(`Received on ${topic}: ${payload}`);
    
    try {
        const data = JSON.parse(payload);
        if (data.type === 'Feature' && data.geometry && data.properties) {
            updateMarker(data);
        }
    } catch (error) {
        addMessage('Error parsing message: ' + error.message);
    }
}

// Subscribe to a topic
function subscribeToTopic(topic) {
    if (mqttClient && mqttClient.isConnected()) {
        mqttClient.subscribe(topic, { qos: 0 });
        addMessage(`Subscribed to topic: ${topic}`);
    }
}

// Publish message button handler
publishBtn.addEventListener('click', () => {
    const topic = topicInput.value;
    const message = messageInput.value;
    
    if (!topic || !message) {
        addMessage('Please enter both topic and message');
        return;
    }
    
    publishMessage(topic, message);
    messageInput.value = '';
});

// Share status button handler
shareStatusBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                // Generate random temperature between -40 and 60 degrees
                const temperature = Math.floor(Math.random() * 100) - 40;
                
                const geojson = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    properties: {
                        temperature: temperature
                    }
                };
                
                const topic = topicInput.value;
                const jsonString = JSON.stringify(geojson);
                publishMessage(topic, jsonString);
                
                // Also update marker directly
                updateMarker(geojson);
            },
            error => {
                addMessage('Error getting location: ' + error.message);
            }
        );
    } else {
        addMessage('Geolocation is not supported by your browser');
    }
});

// Publish message to topic
function publishMessage(topic, message) {
    if (mqttClient && mqttClient.isConnected()) {
        const mqttMessage = new Paho.MQTT.Message(message);
        mqttMessage.destinationName = topic;
        mqttClient.send(mqttMessage);
        addMessage(`Published to ${topic}: ${message}`);
    } else {
        addMessage('Not connected to MQTT broker');
    }
}

// Update marker on map
function updateMarker(data) {
    const latitude = data.geometry.coordinates[1];
    const longitude = data.geometry.coordinates[0];
    const temperature = data.properties.temperature;
    
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Determine marker color based on temperature
    let markerColor;
    if (temperature < 10) {
        markerColor = 'blue';  // Cold: less than 10°C
    } else if (temperature < 30) {
        markerColor = 'green'; // Mild: between 10°C and 30°C
    } else {
        markerColor = 'red';   // Hot: 30°C or higher
    }
    
    // Create colored marker icon
    const markerIcon = L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
   
    userMarker = L.marker([latitude, longitude], {icon: markerIcon}).addTo(map);
    
    userMarker.bindPopup(`<b>Temperature:</b> ${temperature}°C`);
    
    map.setView([latitude, longitude], 15);
}

// Generate random temperature
function getRandomTemperature(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}