//utils.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const EventEmitter = require('events');
class UtilsEmitter extends EventEmitter {}
const utilsEmitter = new UtilsEmitter();
const fs = require('fs');
const ip = require('ip');

// Helper Function: Check if Maximum Devices Reached
async function checkMaxDevicesReached(accountNumber, maxDevices) {
    try {
        const { data, error } = await supabase
            .from('devices')
            .select('*', { count: 'exact' })
            .eq('account_number', accountNumber);

        if (error) {
            throw error;
        }

        return data.length >= maxDevices;
    } catch (error) {
        console.error('Error checking maximum devices:', error.message);
        throw error;
    }
}

async function allocateIpV4Address() {
    const cidr = '10.64.0.0/10';
    console.log(`Allocating IP Address from subnet: ${cidr}`);

    const subnetInfo = ip.cidrSubnet(cidr);
    // Adjust the starting IP address to 10.64.3.1
    const customStartIp = '10.64.3.1'; 
    const startIp = Math.max(ip.toLong(customStartIp), ip.toLong(subnetInfo.firstAddress));
    const endIp = ip.toLong(subnetInfo.lastAddress);

    for (let currentIp = startIp; currentIp <= endIp; currentIp++) {
        const currentIpStr = ip.fromLong(currentIp);
        console.log(`Checking IP Address: ${currentIpStr}`);

        if (await isIpV4Available(currentIpStr)) {
            console.log(`Allocated IP Address: ${currentIpStr}`);
            return currentIpStr;
        }
    }

    console.log('No IP addresses available in the range.');
    throw new Error('No IP addresses available');
}

async function isIpV4Available(ipAddress) {
    console.log(`Checking availability of IP Address: ${ipAddress}`);

    try {
        const { data, error } = await supabase
            .from('devices')
            .select('id')
            .eq('ipv4_address', ipAddress);

        console.log(`Queried devices for IP Address: ${ipAddress}, found ${data.length} entries`);

        // If any device is found with this IP, it's not available
        if (data.length > 0) {
            console.log(`IP Address ${ipAddress} is already in use.`);
            return false;
        }

        // If no device is found with this IP, it's available
        console.log(`IP Address ${ipAddress} is available for allocation.`);
        return true;
    } catch (error) {
        console.error('Error checking IP availability:', error.message);
        throw error;
    }
}



// Somewhere in your utils.js, emit events
//utilsEmitter.emit('update', { type: 'newCustomer', ... });


// Function to generate a JWT with account number and device ID
function generateToken(accountNumber) {
    const payload = {
        accountNumber: accountNumber, // Include account number in payload
        // Add any other payload data you need
    };

    const secret = process.env.JWT_SECRET;
    const options = { expiresIn: '24h' }; // Token expires in 24 hours
    const token = jwt.sign(payload, secret, options);
    console.log(`Token generated for account number ${accountNumber}`);

    // Calculate expiry date (24 hours from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    // Format the expiry date
    const formattedExpiryDate = expiryDate.toISOString().replace('Z', '+00:00');

    return { token, formattedExpiryDate };
}

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.log('No token provided');

        return res.sendStatus(401); // No token provided
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err.message);

            return res.sendStatus(403); // Invalid token
        }
        req.user = user;
        next();
    });
}


function formatDate(date) {
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    return date.getUTCFullYear() +
        '-' + pad(date.getUTCMonth() + 1) +
        '-' + pad(date.getUTCDate()) +
        'T' + pad(date.getUTCHours()) +
        ':' + pad(date.getUTCMinutes()) +
        ':' + pad(date.getUTCSeconds()) +
        '+00:00'; // Time zone offset for UTC
}

// Helper Function: Generate Account Number
function generateAccountNumber() {
    let accountNumber = '';
    const characters = '0123456789';
    for (let i = 0; i < 16; i++) {
        accountNumber += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return accountNumber;
}

// Helper Function: Check if Account Exists
async function checkAccountExists(accountNumber) {
    console.log(`Checking if account exists: ${accountNumber}`);

    const { data, error } = await supabase
        .from('accounts')
        .select('account_number, status') // Assuming there's a 'status' field
        .eq('account_number', accountNumber);

    if (error) {
        console.error('Error checking account:', error.message);
        throw error;
    }

    if (data.length > 0) {
        const account = data[0];
        // Check if account is active, not cancelled or locked
        if (account.status === 'active') {
            console.log(`Account found and active: ${accountNumber}`);
            return true;
        } else {
            console.log(`Account found but not active: ${accountNumber}`);
            return false;
        }
    } else {
        console.log(`Account does not exist: ${accountNumber}`);
        return false;
    }
}

// Helper Function: Insert Account
// utils.js
async function insertAccount(accountNumber) {
    console.log(`utils.js: Attempting to insert account with number: ${accountNumber}`);

    try {
        const { data: insertData, error: insertError } = await supabase
            .from('accounts')
            .insert([{ account_number: accountNumber }])
            .single()
            .select('*'); 

        if (insertError) {
            console.error(`utils.js: Error inserting account:`, insertError);
            throw insertError;
        }

        if (insertData) {
            console.log(`utils.js: Inserted account data:`, insertData);
            return { data: insertData };
        } else {
            console.log(`utils.js: No data returned on insert, querying for account data.`);
            const { data: queryData, error: queryError } = await supabase
                .from('accounts')
                .select('*')
                .eq('account_number', accountNumber)
                .single()
                .select('*'); 

            if (queryError) {
                console.error(`utils.js: Error querying inserted account:`, queryError);
                throw queryError;
            }

            console.log(`utils.js: Queried account data:`, queryData);
            return { data: queryData };
        }
    } catch (error) {
        console.error(`utils.js: Exception when inserting or querying account:`, error);
        return { error };
    }
}


function getRandomFunnyWords() {
    try {
      // Read the words.json file
      const data = fs.readFileSync('./json/words.json', 'utf8');
      const wordsObj = JSON.parse(data);
  
      // Extract the funnyWords array from the JSON object
      const syllables = wordsObj.funnyWords;
  
      // Randomly select two syllables and combine them
      const randomSyllable1 = syllables[Math.floor(Math.random() * syllables.length)];
      const randomSyllable2 = syllables[Math.floor(Math.random() * syllables.length)];
  
      // Combine the syllables to create funny words, capitalize them, and add a space
      const funnyWord1 = randomSyllable1.toUpperCase();
      const funnyWord2 = randomSyllable2.toUpperCase();
      const funnyWords = funnyWord1 + ' ' + funnyWord2;
  
      return funnyWords;
    } catch (error) {
      console.error('Error reading words.json:', error);
      return null;
    }
  }




async function insertDevice(newUuid, accountNumber, pubkey, hijack_dns, name, ipv4_address, ipv6_address) {
    console.log(`Attempting to insert device with ID: ${newUuid}, Account Number: ${accountNumber}, PubKey: ${pubkey}, Hijack DNS: ${hijack_dns}, Name: ${name}, V4 Address: ${ipv4_address}, V6 Address: ${ipv6_address}`);

    try {
        const { data, error } = await supabase
            .from('devices')
            .insert([{ 
                id: newUuid, 
                account_number: accountNumber,
                pubkey: pubkey,
                hijack_dns: hijack_dns,
                name: name,
                ipv4_address: ipv4_address,
                ipv6_address: ipv6_address
            }])
            .single()
            .select('*'); 

        if (error) {
            console.error('Error inserting device:', error.message);
            return null; // Handle the error as per your application's requirement
        }

        console.log('Inserted device data:', data);
        return data; // Should include the 'id' of the inserted device
    } catch (error) {
        console.error('Exception when inserting device:', error.message);
        // Handle the exception as per your application's requirement
    }
}



module.exports = {
    formatDate,
    generateAccountNumber,
    checkAccountExists,
    insertAccount,
    generateToken,
    authenticateToken,
    insertDevice,
    utilsEmitter,
    getRandomFunnyWords,
    allocateIpV4Address,
    checkMaxDevicesReached
};

