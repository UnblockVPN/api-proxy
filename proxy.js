// api proxy running on nodejs express
// Author: David Awatere
// proxy.js
const fs = require('fs');
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());  // Middleware to parse JSON body for POST requests
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded data
app.use((req, res, next) => {
    const oldJson = res.json;

    res.json = function(data) {
        console.log(`Response for ${req.method} ${req.url}: `, data);
        oldJson.apply(res, arguments);
    };

    console.log(`Incoming Request: ${req.method} ${req.url}`);
    console.log(`Headers: `, req.headers);
    console.log(`Body: `, req.body);
  
    next(); // Continue to the next middleware or the request handler
});

  
function transformData(sbData) {  // Function to transform the data from Supabase format to the required format
    if (Array.isArray(sbData) && sbData.length > 0 && sbData[0]['relay_data']) {
        const relayData = sbData[0]['relay_data'];
        return relayData;
    } else {
        console.error('Unexpected data structure or empty array:', sbData);
        return {}; // or return an appropriate default value or error
    }
}

const jsonData = [
      {
        "platform": "android",
        "version": 2023.1,
        "supported": true,
        "latest": "2023.7",
        "latest_stable": "2023.7",
        "latest_beta": null
      },
      {
        "platform": "macos",
        "version": 2023.1,
        "supported": true,
        "latest": "2023.5",
        "latest_stable": "2023.5",
        "latest_beta": "2023.5-beta2"
      },
      {
        "platform": "windows",
        "version": 2023.1,
        "supported": true,
        "latest": "2023.5",
        "latest_stable": "2023.5",
        "latest_beta": "2023.5-beta1"
      },
      {
        "platform": "ios",
        "version": 2023.1,
        "supported": true,
        "latest": "2023.7",
        "latest_stable": "2023.7",
        "latest_beta": "2023.7"
      },
      {
        "platform": "linux",
        "version": 2023.1,
        "supported": true,
        "latest": "2023.5",
        "latest_stable": "2023.5",
        "latest_beta": "2023.5-beta1"
      }
];

const rawRelaysData = fs.readFileSync('relays.json', 'utf8');
const relays = JSON.parse(rawRelaysData);
const apiAddresses = [
    "34.42.109.58:443"
];

app.post('/auth/v1/token', async (req, res) => {
    console.log('Received POST request for /auth/v1/token with data:', req.body);
    try {  // Simulate generating an access token and expiry date
        const accessToken = 'mva_fedcf913645964bcb5332c1e3dd5ce851ef7ba3a98b6508982548403054e2e53';
        const expiryDate = '2023-11-19T21:33:41+00:00';
        console.log('Successfully generated access token and expiry date');
        res.json({ access_token: accessToken, expiry: expiryDate });  // Send a JSON response with the access token and expiry date
    } catch (error) {
        console.error('Error in POST /auth/v1/token:', error.message);
        res.status(500).send('Error while processing request');
    }
});

app.post('/app/v1/www-auth-token', (req, res) => {
    // Extract the Authorization header from the request
    const authHeader = req.headers.authorization;
    // Check if the Authorization header is present and valid
    if (authHeader === 'Bearer mva_fedcf913645964bcb5332c1e3dd5ce851ef7ba3a98b6508982548403054e2e53') {
        // Respond with the auth token
        res.json({ auth_token: "ce824a030d814abc6aa63812b262c99f" });
    } else {
        // Handle invalid or missing Authorization header
        res.status(401).send('Unauthorized');
    }
});

app.post('/app/v1/submit-voucher', (req, res) => {
    // Array of valid voucher codes
    const validVoucherCodes = [
        "CODE-1234-ABCD-CODE", "CODE-5678-EFGH-CODE", "CODE-9012-IJKL-CODE",
        "CODE-3456-MNOP-CODE", "CODE-7890-QRST-CODE", "CODE-1357-UVWX-CODE",
        "CODE-2468-YZAB-CODE", "CODE-3690-CDEF-CODE", "CODE-1470-GHIJ-CODE",
        "CODE-2580-KLMN-CODE"
    ];
    // Extract the voucher code from the request body
    const { voucher_code } = req.body;
        console.log('Request Header:', req.headers);
        console.log('Request Body:', req.body);
        // Validate the voucher code and calculate the new expiry
        // Check if the voucher code is in the array of valid codes
        if (validVoucherCodes.includes(voucher_code)) {
        const timeInSeconds = 2592000; // 30 days in seconds
        const newExpiryDate = new Date(Date.now() + timeInSeconds * 1000); // Calculate the new expiry date
        const response = {
            time_added: timeInSeconds, // time in seconds (30 days)
            new_expiry: formatDate(newExpiryDate), // Call formatDate to get the new expiry date in the desired format
    };
        res.json(response);
    } else {
        res.status(400).json({ error: 'Invalid voucher code' });
    }
});

function formatDate(date) {
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    return date.getUTCFullYear() +
        '-' + pad(date.getUTCMonth() + 1) +
        '-' + pad(date.getUTCDate()) +
        'T' + pad(date.getUTCHours()) +
        ':' + pad(date.getUTCMinutes()) +
        ':' + pad(date.getUTCSeconds()) +
        '+00:00'; // Time zone offset for UTC
}

app.post('/accounts/v1/accounts', (req, res) => {
    const response = {
        "id": "d8ca65f2-335c-4c0a-a6d7-2d4fd01bffa9",
        //"expiry": new Date().toISOString().replace('Z', '+00:00'), // Adjusted to match MV API's format
        "expiry": formatDate(new Date()), // Call formatDate to get the desired format
        "max_ports": 0,
        "can_add_ports": false,
        "max_devices": 5,
        "can_add_devices": true,
        "number": "5647180871195873"
    };
    res.status(201).json(response); // Send 201 Created status code
});


app.post('/accounts/v1/devices', (req, res) => {
    // Extract data from request body
    const { pubkey, hijack_dns } = req.body;
    const response = {
        "id": "d8ca65f2-335c-4c0a-a6d7-2d4fd01bffa9", // Example ID
        "name": "cuddly otter", // Example name
        "pubkey": pubkey, // Echoing back the pubkey from the request
        "hijack_dns": hijack_dns, // Echoing back the hijack_dns value from the request
        "created": "2023-11-26T15:50:25+00:00", // Example creation timestamp
        "ipv4_address": "10.134.153.2/32", // Example IPv4 address
        "ipv6_address": "fc00:bbbb:bbbb:bb01:d:0:6:9902/128", // Example IPv6 address
        "ports": [] // Example ports array, empty in this case
    };

    // Send the response
    res.status(201).json(response);
});

app.get('/accounts/v1/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    const response = {
        "id": deviceId,
        "name": "cuddly otter",
        "pubkey": "wfIcFnL9e1mpaFD95h9zdxGHCWSzSTZY7WAuetceDz0=",
        "hijack_dns": false,
        "created": "2023-11-26T15:50:25+00:00",
        "ipv4_address": "10.134.153.2/32",
        "ipv6_address": "fc00:bbbb:bbbb:bb01:d:0:6:9902/128",
        "ports": []
    };
    // Send the response
    res.json(response);
});

app.post('/wg', (req, res) => {
    const { account, pubkey } = req.body;

    // Here, implement your logic to handle the account and pubkey
    // For example, you might want to validate the account number, generate an IP address, etc.

    // This is a placeholder response. In a real scenario, you would generate a WireGuard configuration.
    const response = {
        ipv4_address: "10.67.208.231/32",
        ipv6_address: "fc00:bbbb:bbbb:bb01::4:d0e6/128"
    };

    res.json(response);
});

app.get('/accounts/v1/accounts/me', (req, res) => {
    const response = {
        "id": "d8ca65f2-335c-4c0a-a6d7-2d4fd01bffa9", // Example account ID
        "expiry": "2023-12-26T15:30:13+00:00", // Example expiry timestamp
        "max_ports": 0, // Example max ports
        "can_add_ports": false, // Example can add ports flag
        "max_devices": 5, // Example max devices
        "can_add_devices": true // Example can add devices flag
    };
    res.json(response); // Send the response
});


app.get('/app/v1/api-addrs', (req, res) => {
    res.json(apiAddresses);
});


app.get('/app/v1/releases/:platform/:version', (req, res) => {
    const { platform, version } = req.params;
    const matchingRelease = jsonData.find(row => 
        row.platform === platform && row.version.toString() === version);
    if (matchingRelease) {
        res.json({
            supported: matchingRelease.supported,
            latest: matchingRelease.latest,
            latest_stable: matchingRelease.latest_stable,
            latest_beta: matchingRelease.latest_beta || null
        });
    } else {
        res.status(404).send('No matching version found');
    }
});

app.get('/app/v1/relays', (req, res) => {
    res.json(relays);
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
