//accounts.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { formatDate, generateAccountNumber,insertAccount , checkAccountExists } = require('../utils');

// POST /accounts/v1/accounts
router.post('/v1/accounts', async (req, res) => {
    try {
        let accountNumber, accountExists;
        do {
            accountNumber = generateAccountNumber();
            accountExists = await checkAccountExists(accountNumber);
        } while (accountExists);

        await insertAccount(accountNumber);

        const response = {
            id: "d8ca65f2-335c-4c0a-a6d7-2d4fd01bffa9",
            expiry: formatDate(new Date()),
            max_ports: 0,
            can_add_ports: false,
            max_devices: 5,
            can_add_devices: true,
            number: accountNumber
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error in POST /accounts/v1/accounts:', error.message);
        res.status(500).send('Error while processing request');
    }
});

// POST /accounts/v1/devices
router.post('/v1/devices', (req, res) => {
    const { pubkey, hijack_dns } = req.body;
    const response = {
        id: "d8ca65f2-335c-4c0a-a6d7-2d4fd01bffa9",
        name: "cuddly otter",
        pubkey: pubkey,
        hijack_dns: hijack_dns,
        created: "2023-11-26T15:50:25+00:00",
        ipv4_address: "10.64.0.2/32",
        ipv6_address: "fc00:bbbb:bbbb:bb01:d:0:6:9902/128",
        ports: []
    };

    res.status(201).json(response);
});

// GET /accounts/v1/devices/:id
router.get('/v1/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    const response = {
        id: deviceId,
        name: "cuddly otter",
        hijack_dns: false,
        created: "2023-11-26T15:50:25+00:00",
        ipv4_address: "10.64.0.2/32",
        ipv6_address: "fc00:bbbb:bbbb:bb01:d:0:6:9902/128",
        ports: []
    };

    res.json(response);
});

// GET /accounts/v1/accounts/me
router.get('/v1/accounts/me', (req, res) => {
    const response = {
        id: "d8ca65f2-335c-4c0a-a6d7-2d4fd01bffa9",
        expiry: "2023-12-26T15:30:13+00:00",
        max_ports: 0,
        can_add_ports: false,
        max_devices: 5,
        can_add_devices: true
    };

    res.json(response);
});

module.exports = router;
