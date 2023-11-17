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
app.get('/rest/v1/relays', async (req, res) => {
    console.log('Received GET request for /rest/v1/relays');
    try {
        const apiKey = process.env.API_KEY;
        const url = `https://oklyglwabkhjmbmxsdga.supabase.co/rest/v1/relays?apikey=${apiKey}`;

        console.log(`Making GET request to ${url}`);
        const response = await axios.get(url);

        const transformedResponse = transformData(response.data);
        res.json(transformedResponse);
    } catch (error) {
        console.error('Error in GET /rest/v1/relays:', error.message);
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
