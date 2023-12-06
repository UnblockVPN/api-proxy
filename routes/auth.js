//auth.js
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { generateToken, checkAccountExists } = require('../utils');
const express = require('express');
const router = express.Router();

// Include other necessary dependencies if needed

router.post('/v1/token', async (req, res) => {
    const { account_number } = req.body;
    try {
        if (await checkAccountExists(account_number)) {
            const { token, formattedExpiryDate } = generateToken({ accountId: account_number });
            console.log(`Token for account number ${account_number}: ${token}`);
            res.json({ access_token: token, expiry: formattedExpiryDate });
        } else {
            res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error('Error in POST /auth/v1/token:', error.message);
        res.status(500).send('Error while processing request');
    }
});

module.exports = router;
