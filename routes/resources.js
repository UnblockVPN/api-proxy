// resources.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { validateVoucher, redeemVoucher, authenticateWithToken, verifyAppleReceipt} = require('../utils');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.post('/v1/create-apple-payment', authenticateWithToken, async (req, res) => {
    const receiptString = req.body.receiptString;
    const isProduction = true; // Or determine based on environment

    if (!receiptString) {
        return res.status(400).send('Receipt string is required');
    }

    // Verify the receipt with Apple
    const receiptVerification = await verifyAppleReceipt(receiptString, isProduction);

    try {
        const token = req.user.token; // Extracted by authenticateWithToken middleware
        const accountNumber = req.user.accountNumber; // Assuming account number is also part of user info

        // Update the account with the Apple receipt and API response
        const { error: updateError } = await supabase
            .from('accounts')
            .update({ 
                apple_receipt: receiptString, 
                apple_api_response: receiptVerification.data || receiptVerification.error // Store the full response or error
            })
            .eq('cryptotoken', token)
            .eq('account_number', accountNumber); // Ensure this matches your database schema

        if (updateError) {
            console.error('Error updating account with Apple receipt and API response:', updateError.message);
            return res.status(500).send('Failed to update account with receipt and API response');
        }

        res.status(200).send('Apple receipt and API response stored successfully');
    } catch (error) {
        console.error('Error in POST /app/v1/create-apple-payment:', error.message);
        res.status(500).send('Error while processing request');
    }
});






// POST /app/v1/submit-voucher
router.post('/v1/submit-voucher', authenticateWithToken, async (req, res) => {
    try {
        // Extracting accountNumber from the user object
        const accountNumber = req.user.accountNumber;
        console.log(`resources.js: Received POST request for /app/v1/submit-voucher with account number: ${accountNumber}`);

        // Validate the provided voucher code
        const voucherCode = req.body.voucher_code;
        console.log(`resources.js: Validating voucher code: ${voucherCode}`);
        const voucherValidation = await validateVoucher(voucherCode, accountNumber);

        if (!voucherValidation.isValid) {
            console.log(`resources.js: Invalid voucher code: ${voucherCode}`);
            return res.status(400).send('Invalid voucher code');
        }
        console.log(`resources.js: Voucher code validation returned: isValid - ${voucherValidation.isValid}, accountNumber - ${voucherValidation.accountNumber}, duration - ${voucherValidation.duration}`);

        // Redeem the voucher and update the account's expiry
        const updatedAccount = await redeemVoucher(accountNumber, voucherValidation.duration, voucherCode);
        if (!updatedAccount) {
            console.log('resources.js: Error updating account with new expiry date');
            return res.status(500).send('Error updating account');
        }

        console.log(`resources.js: Account updated successfully. Account Number: ${accountNumber}, New Expiry: ${updatedAccount.newExpiry}`);
        res.status(200).json({
            time_added: voucherValidation.duration,
            new_expiry: updatedAccount.newExpiry
        });
    } catch (error) {
        console.error(`resources.js: Error in /app/v1/submit-voucher: ${error.message}`);
        res.status(500).send('Error processing voucher submission');
    }
});














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


module.exports = router;
