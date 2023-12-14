//auth.js
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { generateToken, validateVoucher,checkAccountExists } = require('../utils');
const express = require('express');
const router = express.Router();




router.post('/v1/token', async (req, res) => {
    const { account_number } = req.body;
    try {
        if (await checkAccountExists(account_number)) {
            const tokenData = await generateToken(account_number);
            if (tokenData) {
                console.log(`Token for account number ${account_number}: ${tokenData.access_token}`);
                res.json({ access_token: tokenData.access_token, expiry: tokenData.expiry });
            } else {
                res.status(500).send('Failed to generate token');
            }
        } else {
            res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error('Error in POST /auth/v1/token:', error.message);
        res.status(500).send('Error while processing request');
    }
});

module.exports = router;
