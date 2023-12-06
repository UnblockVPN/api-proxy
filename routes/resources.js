// resources.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { formatDate, authenticateToken, generateAccountNumber,insertAccount , checkAccountExists } = require('../utils');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);



// GET /app/v1/relays
router.get('/v1/relays', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'json', 'relays.json');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const relays = JSON.parse(rawData);
        
        res.json(relays); // Send the parsed JSON data as response
    } catch (error) {
        console.error('Error reading relays data:', error);
        res.status(500).send('Error retrieving relays data');
    }
});

// GET /app/v1/api-addrs
router.get('/v1/api-addrs', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'json', 'api-addrs.json');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const apiAddresses = JSON.parse(rawData);

        res.json(apiAddresses); // Send the parsed JSON data as response
    } catch (error) {
        console.error('Error reading API addresses:', error);
        res.status(500).send('Error retrieving API addresses');
    }
});

// GET /app/v1/releases/:platform/:version
router.get('/v1/releases/:platform/:version', (req, res) => {
    try {
        const { platform, version } = req.params;
        const filePath = path.join(__dirname, '..', 'json', 'releases.json');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);

        const matchingRelease = jsonData.find(row => 
            row.platform === platform && row.version === version);
        
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
    } catch (error) {
        console.error('Error reading releases data:', error);
        res.status(500).send('Error retrieving releases data');
    }
});

// POST /app/v1/www-auth-token
router.post('/v1/www-auth-token', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer mva_fedcf913645964bcb5332c1e3dd5ce851ef7ba3a98b6508982548403054e2e53') {
        res.json({ auth_token: "ce824a030d814abc6aa63812b262c99f" });
    } else {
        res.status(401).send('Unauthorized');
    }
});


router.post('/v1/submit-voucher', authenticateToken, async (req, res) => {
    const { voucher_code } = req.body;

    try {
        // Check if voucher code exists and its status
        let { data: voucherData, error } = await supabase
            .from('voucher_codes')
            .select('*')
            .eq('voucher_number', voucher_code)
            .single();

        if (error || !voucherData) {
            return res.status(404).send('Voucher code not found');
        }

        if (voucherData.status !== 'active' || voucherData.new_expiry != null) {
            return res.status(400).send('Voucher code already redeemed or not active');
        }

        // Calculate new expiry date based on the 'amount' (months) column
        const newExpiryDate = new Date();
        newExpiryDate.setMonth(newExpiryDate.getMonth() + voucherData.amount);

        // Update voucher code with new expiry and status
        const { error: updateError } = await supabase
            .from('voucher_codes')
            .update({ new_expiry: newExpiryDate.toISOString().replace('Z', '+00:00'), status: 'redeemed' })
            .eq('voucher_number', voucher_code);

        if (updateError) {
            throw updateError;
        }

        res.json({
            time_added: voucherData.amount * 2592000, // Assuming 1 month = 30 days
            new_expiry: newExpiryDate.toISOString().replace('Z', '+00:00')
        });
    } catch (error) {
        console.error('Error submitting voucher:', error);
        res.status(500).send('Error processing voucher submission');
    }
});
module.exports = router;
