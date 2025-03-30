ENGO551 - Lab 5: IoT Geoweb Application

A web application that uses MQTT protocol to create a real-time location-sharing system with temperature visualization.

Features

- Connect to an MQTT broker using WebSockets
- Publish messages to MQTT topics
- Share current GPS location with temperature data
- Visualize location data on a map with color-coded temperature indicators
- Bidirectional communication with MQTTX

Usage Instructions
Basic Setup

1. Open the application in a web browser
2. Enter MQTT broker details:
   - Host: test.mosquitto.org
   - Port: 8080 (or 8081)
   - Click "Start Connection"

 Publishing Messages
1. Enter a topic (format: `ENGO551/your_name/my_temperature`)
2. Type a message or click "Share My Status" to send location and temperature
3. The map displays your location with color-based temperature indicators:
   - Blue: Below 10°C
   - Green: 10-30°C
   - Red: Above 30°C

Testing with MQTTX
1. Install [MQTTX](https://mqttx.app/)
2. Connect to test.mosquitto.org (port 1883)
3. Subscribe to your topic
4. Send GeoJSON messages to update the map:
   ```json
   {
     "type": "Feature",
     "geometry": {
       "type": "Point",
       "coordinates": [-114.07, 51.05]
     },
     "properties": {
       "temperature": 40
     }
   }
   ```

Tech Stuff

- MQTT over WebSockets (Paho MQTT client)
- Leaflet.js for interactive mapping
- JavaScript Geolocation API
- MQTTX for testing

Mobile Testing
- Access the GitHub Pages URL on your smartphone
- Grant location permissions when prompted
- Test all features in a mobile browser

Requirements
- Modern web browser with WebSocket support
- Internet connection
- GPS-enabled device for location sharing