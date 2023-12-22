//accounts.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { formatDate, getRandomFunnyWords, utilsEmitter, authenticateWithToken, checkMaxDevicesReached, allocateIpV4Address, generateAccountNumber, insertAccount , insertDevice, checkAccountExists } = require('../utils');


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

        // Generate a new unique UUID for the device
        const newUuid = uuidv4(); 
        console.log(`accounts.js: Generated UUID for device: ${newUuid}`);

        // Set the expiry timestamp to 4 hours from now
        const expiryTimestamp = new Date();
        expiryTimestamp.setHours(expiryTimestamp.getHours() + 4);
        const formattedExpiry = expiryTimestamp.toISOString().split('.')[0] + '+00:00';

        console.log(`accounts.js: Attempting to insert account with number: ${accountNumber} and expiry: ${formattedExpiry}`);
        const account = await insertAccount(accountNumber, formattedExpiry);
        console.log(`accounts.js: Inserted account data:`, account);

        const response = {
            id: newUuid,
            expiry: formattedExpiry,
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
        const token = req.user.token;
        console.log(`accounts.js: Token from request: ${token}`);

        // Fetch account number based on token
        const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('account_number, max_devices')
            .eq('cryptotoken', token)
            .maybeSingle();

        if (accountError || !accountData) {
            console.error('accounts.js: Error fetching account details or token not found');
            return res.status(500).send('Error fetching account details');
        }

        const accountNumber = accountData.account_number;
        const maxDevices = parseInt(accountData.max_devices, 10);
        console.log(`accounts.js: Account number from token: ${accountNumber}, max devices allowed: ${maxDevices}`);

        const { pubkey, hijack_dns } = req.body;
        console.log(`accounts.js: pubkey: ${pubkey}, hijack_dns: ${hijack_dns}`);

        // Check if the maximum number of devices has been reached
        if (await checkMaxDevicesReached(accountNumber, maxDevices)) {
            console.error(`accounts.js: Exceeded maximum number of devices for account: ${accountNumber}`);
            return res.status(400).send('Exceeded maximum number of devices per account');
        }

        // Generate a unique device ID and a random name
        const deviceId = uuidv4();
        const name = getRandomFunnyWords();
        const ipv4_address = await allocateIpV4Address();
        const ipv6_address = "fc00:bbbb:bbbb:bb01:d:0:8:1727/128";

        // Insert device details into the database
        await insertDevice(deviceId, accountNumber, pubkey, hijack_dns, name, ipv4_address, ipv6_address);
        console.log(`accounts.js: Device inserted with ID: ${deviceId}`);

        // Format the created timestamp
        const createdTimestamp = new Date().toISOString().split('.')[0] + '+00:00';

        const response = {
            id: deviceId,
            name: name,
            pubkey: pubkey,
            hijack_dns: hijack_dns,
            created: createdTimestamp,
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



// DELETE /accounts/v1/devices/:id
router.delete('/v1/devices/:id', async (req, res) => {
    const deviceId = req.params.id;
    logger.debug(`Received delete request for device with ID: ${deviceId}`);

    try {
        // Fetch device details for emitting the event
        const { data: deviceData, error: fetchError } = await supabase
            .from('devices')
            .select('pubkey, ipv4_address')
            .eq('id', deviceId)
            .maybeSingle();

        if (fetchError || !deviceData) {
            if (fetchError) {
                logger.error(`Error fetching device for delete event: ${fetchError.message}`);
            } else {
                logger.error(`Error fetching device for delete event: Unknown error`);
            }
            return res.status(404).json(false);
        }

        // Emit the delete event
        emitDeleteDeviceEvent(deviceData.pubkey, deviceData.ipv4_address);
        logger.debug(`Delete event emitted for device ID: ${deviceId}`);

        // Respond early to the client
        res.status(200).json(true);

        // Proceed with device deletion
        const { error: deleteError } = await supabase
            .from('devices')
            .delete()
            .match({ id: deviceId });

        if (deleteError) {
            logger.error(`Error deleting device: ${deleteError.message}`);
            // Handle deletion error (optional, as response is already sent)
        }

        logger.debug(`Device with ID ${deviceId} deleted successfully.`);

    } catch (error) {
        logger.error(`Server error in DELETE /accounts/v1/devices/${deviceId}: ${error.message}`);
        // Note: Response already sent, handling error internally
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
        console.log('accounts.js: Received GET request for /accounts/v1/accounts/me');
        const accountNumber = req.user.accountNumber;
        console.log(`accounts.js: Account number from token: ${accountNumber}`);

        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('account_number', accountNumber);

        if (error) {
            console.error('accounts.js: Error fetching account data:', error.message);
            return res.status(500).send('Error retrieving account information');
        }

        if (data && data.length > 0) {
            const account = data[0];
            console.log(`accounts.js: Account data retrieved successfully for account number: ${accountNumber}`);
            const response = {
                id: account.id,
                expiry: formatDate(new Date(account.expiry)),
                max_ports: parseInt(account.max_ports, 10) || 0,
                can_add_ports: account.can_add_ports === 'true',
                max_devices: parseInt(account.max_devices, 10) || 5,
                can_add_devices: account.can_add_devices === 'true'
            };

            return res.json(response);
        } else {
            console.log(`accounts.js: No account found for account number: ${accountNumber}`);
            return res.status(404).send('Account not found');
        }
    } catch (error) {
        console.error('accounts.js: Error in GET /accounts/v1/accounts/me:', error.message);
        res.status(500).send('Error while processing request');
    }
});









module.exports = router;
