//accounts.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { formatDate, getRandomFunnyWords, authenticateWithToken, checkMaxDevicesReached, allocateIpV4Address, generateAccountNumber,authenticateToken, insertAccount , insertDevice, checkAccountExists } = require('../utils');

// POST /accounts/v1/accounts
router.post('/v1/accounts', async (req, res) => {
    try {
        let accountNumber, accountExists;
        do {
            accountNumber = generateAccountNumber();
            console.log(`accounts.js: Generated account number: ${accountNumber}`);
            console.log(`accounts.js: Checking if account exists: ${accountNumber}`);
            accountExists = await checkAccountExists(accountNumber);
            console.log(`accounts.js: Account exists: ${accountExists}`);
        } while (accountExists);

        console.log(`accounts.js: Attempting to insert account with number: ${accountNumber}`);
        const account = await insertAccount(accountNumber);
        console.log(`accounts.js: Inserted account data:`, account);
        const newUuid = uuidv4(); // Generate a new unique UUID for the device
        console.log(`accounts.js: Generated UUID for device: ${newUuid}`);
        console.log(`accounts.js: Attempting to insert device with ID: ${newUuid} for account: ${accountNumber}`);
        await insertDevice(newUuid, accountNumber);
        console.log(`accounts.js: Inserted device for account number ${accountNumber}`);
        const response = {
            id: newUuid,
            expiry: formatDate(new Date()),
            max_ports: 0,
            can_add_ports: false,
            max_devices: 5,
            can_add_devices: true,
            number: accountNumber
        };
        console.log(`accounts.js: Sending response:`, response);
        res.status(201).json(response);
    } catch (error) {
        console.error('accounts.js: Error in POST /accounts/v1/accounts:', error.message);
        res.status(500).send('accounts.js: Error while processing request');
    }
});



// POST /accounts/v1/devices
router.post('/v1/devices', authenticateWithToken, async (req, res) => {
    console.log('accounts.js: Received POST request for /accounts/v1/devices');

    try {
        const accountNumber = req.user.accountNumber.accountId;
        const { pubkey, hijack_dns } = req.body;
        console.log(`accounts.js: Account number from token: ${accountNumber}, pubkey: ${pubkey}, hijack_dns: ${hijack_dns}`);

        // Fetch the max devices allowed for the account
        const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('max_devices')
            .eq('account_number', accountNumber)
            .single();

        if (accountError || !accountData) {
            console.error('accounts.js: Error fetching account details or account not found');
            return res.status(500).send('Error fetching account details');
        }

        const maxDevices = parseInt(accountData.max_devices, 10);

        // Check if the maximum number of devices has been reached
        if (await checkMaxDevicesReached(accountNumber, maxDevices)) {
            console.error(`accounts.js: Exceeded maximum number of devices for account: ${accountNumber}`);
            return res.status(400).send('Exceeded maximum number of devices per account');
        }

        // Generate a unique device ID
        const deviceId = uuidv4();
        console.log(`accounts.js: Generated device ID: ${deviceId}`);

        // Generate a random name
        const name = getRandomFunnyWords();
        const ipv4_address = await allocateIpV4Address();
        const ipv6_address = "fc00:bbbb:bbbb:bb01:d:0:8:1727/128";

        // Insert device details into the database
        await insertDevice(deviceId, accountNumber, pubkey, hijack_dns, name, ipv4_address, ipv6_address);
        console.log(`accounts.js: Device inserted with ID: ${deviceId}`);

        const response = {
            id: deviceId,
            name: name,
            pubkey: pubkey,
            hijack_dns: hijack_dns,
            created: new Date().toISOString(),
            ipv4_address: ipv4_address,
            ipv6_address: ipv6_address,
            ports: []
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('accounts.js: Error in POST /accounts/v1/devices:', error.message);
        res.status(500).send('accounts.js: Error while processing request');
    }
});






// GET /accounts/v1/devices/:id
router.get('/v1/devices/:id', async (req, res) => {
    const deviceId = req.params.id;
    console.log(`devices.js: Received request for device with ID: ${deviceId}`);

    try {
        // Add logic here to retrieve device information from the database using the deviceId
        // For now, using a mock response
        const response = {
            id: deviceId,
            name: "cuddly otter",
            hijack_dns: false,
            created: "2023-11-26T15:50:25+00:00",
            ipv4_address: "10.64.0.2/32",
            ipv6_address: "fc00:bbbb:bbbb:bb01:d:0:6:9902/128",
            ports: []
        };

        console.log(`devices.js: Sending response for device with ID: ${deviceId}`);
        res.json(response);
    } catch (error) {
        console.error(`devices.js: Error in GET /accounts/v1/devices/${deviceId}:`, error.message);
        res.status(500).send(`Error retrieving device with ID: ${deviceId}`);
    }
});


// GET /accounts/v1/accounts/me


router.get('/v1/accounts/me', authenticateWithToken, async (req, res) => {
    try {
        const accountNumber = req.user.accountNumber;
        console.log(`Fetching account data for account number: ${accountNumber}`);

        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('account_number', accountNumber)
            .maybeSingle();

        if (error) {
            console.error('Error fetching account data:', error.message);
            return res.status(500).send('Error retrieving account information');
        }

        if (data) {
            console.log(`Account data retrieved successfully: ${JSON.stringify(data)}`);
            const response = {
                id: data.id,
                expiry: formatDate(new Date(data.created_at)), // Assuming expiry is based on created_at
                max_ports: parseInt(data.max_ports) || 0,
                can_add_ports: data.can_add_ports === 'true',
                max_devices: parseInt(data.max_devices) || 5,
                can_add_devices: data.can_add_devices === 'true'
            };

            return res.json(response);
        } else {
            console.log('Account not found for the given account number');
            return res.status(404).send('Account not found');
        }
    } catch (error) {
        console.error('Error in GET /accounts/v1/accounts/me:', error.message);
        res.status(500).send('Error while processing request');
    }
});





module.exports = router;
