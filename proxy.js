// api-proxy running on Vercel
// Author: David Awatere
// proxy.js

const express = require('express');
const axios = require('axios');

const app = express();

// Middleware to parse JSON body for POST requests
app.use(express.json());

const port = process.env.PORT || 3000;

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

app.get('/app/v1/releases/:platform/:version', async (req, res) => {
    try {
        const { platform, version } = req.params;

        // Fetch the release information from your database
        // This is a placeholder - implement the actual database query logic
        const releaseInfo = await getReleaseInfo(platform, version);

        if (releaseInfo) {
            res.json(releaseInfo);
        } else {
            res.status(404).send('Release information not found');
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
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
