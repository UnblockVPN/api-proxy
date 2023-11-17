const express = require('express');
const axios = require('axios');

const app = express();

// Middleware to parse JSON body for POST requests
app.use(express.json());

const port = process.env.PORT || 3000;

// Proxy endpoint for GET requests
app.get('/api/proxy', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        const url = `https://oklyglwabkhjmbmxsdga.supabase.co/rest/v1/relays?apikey=${apiKey}`;

        const response = await axios.get(url);

        // Transform the SB response to match the MV structure
        const transformedResponse = response.data['relay-data']['0'];

        res.json(transformedResponse);
    } catch (error) {
        res.status(500).send('Error while processing request');
    }
});

// New POST proxy endpoint for /v1/submit-voucher
app.post('/v1/submit-voucher', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        const url = 'https://api.mullvad.net/v1/submit-voucher';

        const postData = req.body; // e.g., { "voucher_code": "ABCD-EFGH-1234-5678" }

        const response = await axios.post(url, postData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error while processing request');
    }
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
