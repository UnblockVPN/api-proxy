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
    // ... your JSON data ...
    {
        "platform": "android",
        "version": 2023.0,
        "supported": true,
        "latest": 2023.7,
        "latest_stable": 2023.7,
        "latest_beta": ""
      },
      {
        "platform": "android",
        "version": 2023.1,
        "supported": true,
        "latest": 2023.7,
        "latest_stable": 2023.7,
        "latest_beta": "2023.4-beta"
      },
      {
        "platform": "macos",
        "version": 2023.1,
        "supported": true,
        "latest": 2023.1,
        "latest_stable": 2023.1,
        "latest_beta": "2023.1"
      },
      {
        "platform": "windows",
        "version": 2023.1,
        "supported": true,
        "latest": 2023.1,
        "latest_stable": 2023.1,
        "latest_beta": "2023.1"
      },
      {
        "platform": "ios",
        "version": 2023.1,
        "supported": true,
        "latest": 2023.1,
        "latest_stable": 2023.1,
        "latest_beta": "2023.1"
      }
];

app.get('/app/v1/releases/:platform', (req, res) => {
    const { platform } = req.params;

    // Filter the data for the specified platform
    const filteredData = jsonData.filter(row => row.platform === platform);

    // Find the latest version
    let latestRelease = null;

    filteredData.forEach(row => {
        if (!latestRelease || parseFloat(row.latest) > parseFloat(latestRelease.latest)) {
            latestRelease = row;
        }
    });

    if (latestRelease) {
        res.json({
            supported: latestRelease.supported,
            latest: latestRelease.latest,
            latest_stable: latestRelease.latest_stable,
            latest_beta: latestRelease.latest_beta || null
        });
    } else {
        res.status(404).send('No matching version found');
    }
});

async function getReleaseInfo(platform, version) {
    // Implement the logic to fetch release information from the database
    // This function should return the object with the release information
    // or null if not found
}


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
