const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Proxy endpoint
app.get('/api/proxy', async (req, res) => {
    try {
        // Access the API_KEY from environment variables
        const apiKey = process.env.API_KEY;

        // Construct the URL with the API key
        const url = `https://oklyglwabkhjmbmxsdga.supabase.co/rest/v1/relays?apikey=${apiKey}`;

        // Make a request to the SB API
        const response = await axios.get(url);

        // Transform the SB response to match the MV structure
        const transformedResponse = response.data['relay-data']['0'];

        // Send the transformed response back to the client
        res.json(transformedResponse);
    } catch (error) {
        // Handle errors (e.g., network issues, transformation errors)
        res.status(500).send('Error while processing request');
    }
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
