// api-proxy running on Vercel
// Author: David Awatere
// proxy.js

const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;


// Middleware to parse JSON body for POST requests
app.use(express.json());



// Function to transform the data from Supabase format to the required format
function transformData(sbData) {
    if (Array.isArray(sbData) && sbData.length > 0 && sbData[0]['relay_data']) {
        const relayData = sbData[0]['relay_data'];
        return relayData;
    } else {
        console.error('Unexpected data structure or empty array:', sbData);
        return {}; // or return an appropriate default value or error
    }
}

// JSON data
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



// Predefined list of API addresses
const apiAddresses = [
    "45.83.223.196:443",
    "193.138.218.71:444",
    "185.65.134.66:444",
    "185.65.135.117:444",
    "91.90.44.10:444"
    // Add more addresses as needed
];

// New POST proxy endpoint for /auth/v1/token
/* unix: curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"account_number":"3296934143562192"}' \
     https://api.mullvad.net/auth/v1/token

{"access_token":"mva_fedcf913645964bcb5332c1e3dd5ce851ef7ba3a98b6508982548403054e2e53","expiry":"2023-11-19T21:33:41+00:00"}  
(Note: Account number is generated by the app)*/

app.post('/auth/v1/token', async (req, res) => {
    console.log('Received POST request for /auth/v1/token with data:', req.body);
    try {
        // Simulate generating an access token and expiry date
        const accessToken = 'mva_fedcf913645964bcb5332c1e3dd5ce851ef7ba3a98b6508982548403054e2e53';
        const expiryDate = '2023-11-19T21:33:41+00:00';

        console.log('Successfully generated access token and expiry date');
        
        // Send a JSON response with the access token and expiry date
        res.json({ access_token: accessToken, expiry: expiryDate });
    } catch (error) {
        console.error('Error in POST /auth/v1/token:', error.message);
        res.status(500).send('Error while processing request');
    }
});

/* unix: curl -X POST \
     -H "Authorization: Bearer mva_1f8fd3174195d63278134614e9494309d25ba1a8684dece02444d520a5127df5" \
     https://api.mullvad.net/app/v1/www-auth-token

{"auth_token":"ce824a030d814abc6aa63812b262c99f"}%   */

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

    // Validate the voucher code and calculate the new expiry
    // This is just a placeholder logic. Replace with your actual logic.
    // Check if the voucher code is in the array of valid codes
    if (validVoucherCodes.includes(voucher_code)) {
        // Example response
        const response = {
            time_added: 2592000, // time in seconds
            new_expiry: new Date(Date.now() + 2592000000).toISOString() // new expiry date 30 days from now
        };

        res.json(response);
    } else {
        // Handle invalid voucher codes
        res.status(400).json({ error: 'Invalid voucher code' });
    }
});

app.get('/app/v1/api-addrs', (req, res) => {
    res.json(apiAddresses);
});

app.get('/app/v1/releases/:platform/:version', (req, res) => {
    const { platform, version } = req.params;

    // Find the matching platform and version
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


// Proxy endpoint for GET requests
app.get('/app/v1/relays', async (req, res) => {
    console.log('Received GET request for /app/v1/relays');
    try {
        const apiKey = process.env.API_KEY;
        const url = `https://oklyglwabkhjmbmxsdga.supabase.co/rest/v1/relays?apikey=${apiKey}`;

        console.log(`Making GET request to ${url}`);
        const response = await axios.get(url);

        const transformedResponse = transformData(response.data);
        res.json(transformedResponse);
    } catch (error) {
        console.error('Error in GET /app/v1/relays:', error.message);
        res.status(500).send('Error while processing request');
    }
});

// New POST proxy endpoint for /rest/v1/submit-voucher
app.post('/rest/v1/submit-voucher', async (req, res) => {
    console.log('Received POST request for /rest/v1/submit-voucher with data:', req.body);
    try {
        const apiKey = process.env.API_KEY;
        const url = 'https://api.mullvad.net/v1/submit-voucher';

        const postData = req.body;

        console.log(`Making POST request to ${url} with data:`, postData);
        const response = await axios.post(url, postData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        console.log('Successfully submitted voucher and received response');
        res.json(response.data);
    } catch (error) {
        console.error('Error in POST /rest/v1/submit-voucher:', error.message);
        res.status(500).send('Error while processing request');
    }
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
