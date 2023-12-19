//utils.js
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const EventEmitter = require('events');
class UtilsEmitter extends EventEmitter {}
const utilsEmitter = new UtilsEmitter();
const fs = require('fs');
const ip = require('ip');
const axios = require('axios');

async function getCurrentExpiry(accountNumber) {
    console.log(`utils.js: Fetching current expiry for account ${accountNumber}`);
    const { data, error } = await supabase
        .from('accounts')
        .select('expiry')
        .eq('account_number', accountNumber)
        .single();

    if (error) {
        console.error(`utils.js: Error fetching current expiry for account ${accountNumber}: ${error.message}`);
        throw error;
    }

    const currentExpiry = data ? new Date(data.expiry) : new Date();
    console.log(`utils.js: Current expiry for account ${accountNumber} is: ${currentExpiry}`);
    return currentExpiry;
}

function addTimeToExpiry(expiryDate, timeInSeconds) {
    console.log(`utils.js: Adding ${timeInSeconds} seconds to expiry date ${expiryDate}`);
    const newExpiry = new Date(expiryDate.getTime() + timeInSeconds * 1000);
    const formattedNewExpiry = newExpiry.toISOString().split('.')[0] + '+00:00'; // Format as per requirement
    console.log(`utils.js: New expiry date after addition is: ${formattedNewExpiry}`);
    return formattedNewExpiry;
}



async function verifyAppleReceipt(receiptString, isProduction = true) {
    let endpoint = isProduction 
        ? 'https://buy.itunes.apple.com/verifyReceipt' 
        : 'https://sandbox.itunes.apple.com/verifyReceipt';

    try {
        let response = await sendReceiptToApple(endpoint, receiptString);
        
        // Check if the receipt is from the test environment but was sent to the production environment
        if (response.status === 200 && response.data.status === 21007) {
            console.log('utils.js: Receipt is from the sandbox but was sent to production, redirecting to sandbox');
            endpoint = 'https://sandbox.itunes.apple.com/verifyReceipt';
            response = await sendReceiptToApple(endpoint, receiptString);
        }

        if (response.status === 200 && response.data.status === 0) {
            console.log('utils.js: Valid receipt received from Apple');
            return { isValid: true, data: response.data };
        } else {
            console.warn('utils.js: Apple receipt validation failed:', response.data);
            return { isValid: false, error: response.data };
        }
    } catch (error) {
        console.error('utils.js: Error verifying Apple receipt:', error.message);
        return { isValid: false, error: error.message };
    }
}

async function sendReceiptToApple(endpoint, receiptString) {
    return await axios.post(endpoint, {
        'receipt-data': receiptString,
        'password': process.env.APPLE_SHARED_SECRET,
        'exclude-old-transactions': true
    });
}






async function validateVoucher(voucherCode, accountNumber) {
    console.log(`utils.js: Starting voucher validation for code: ${voucherCode}`);

    try {
        const { data: voucherData, error: voucherError } = await supabase
            .from('vouchers')
            .select('duration_months')
            .eq('code', voucherCode)
            .maybeSingle();

        if (voucherError) {
            console.error(`utils.js: Error while fetching voucher: ${voucherError.message}`);
            return { isValid: false, error: voucherError };
        }

        if (!voucherData) {
            console.log(`utils.js: No voucher found with code: ${voucherCode}`);
            return { isValid: false, error: 'Voucher not found' };
        }

        if (voucherData.is_used) {
            console.log(`utils.js: Voucher ${voucherCode} has already been redeemed.`);
            return { isValid: false, error: 'Voucher already redeemed' };
        }

        // Ensure that voucherData.duration_months is a valid number
        const durationMonths = parseFloat(voucherData.duration_months);

        if (!isNaN(durationMonths)) {
            // Calculate the duration in seconds accurately
            const durationInSeconds = durationMonths * 30 * 24 * 60 * 60; // Convert months to seconds
            console.log(`utils.js: Voucher ${voucherCode} is valid and not yet redeemed.`);
            return { 
                isValid: true, 
                accountNumber: accountNumber, // Or retrieve from voucherData if necessary
                duration: durationInSeconds // Use the calculated duration
            };
        } else {
            console.error(`utils.js: Invalid duration in voucher data: ${voucherData.duration_months}`);
            return { isValid: false, error: 'Invalid duration in voucher data' };
        }
    } catch (error) {
        console.error(`utils.js: Exception occurred in validateVoucher: ${error.message}`);
        return { isValid: false, error };
    }
}

async function redeemVoucher(accountNumber, durationInSeconds, voucherCode) {
    console.log(`utils.js: Redeeming voucher for account number: ${accountNumber} with duration: ${durationInSeconds} seconds for voucher code: ${voucherCode}`);

    try {
        const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('expiry')
            .eq('account_number', accountNumber)
            .maybeSingle();

        if (accountError || !accountData) {
            console.error(`utils.js: Error fetching account details for account: ${accountNumber}, Error: ${JSON.stringify(accountError)}`);
            return null;
        }

        // Calculate new expiry date and format it
        let newExpiry = new Date(accountData.expiry || new Date());
        newExpiry.setSeconds(newExpiry.getSeconds() + durationInSeconds);
        const formattedNewExpiry = newExpiry.toISOString().replace(/\.\d{3}/, '');

        console.log(`utils.js: Fetched account details successfully for account: ${accountNumber}`);

        // Update account expiry
        const { error: updatedAccountError } = await supabase
            .from('accounts')
            .update({ expiry: formattedNewExpiry })
            .eq('account_number', accountNumber);

        if (updatedAccountError) {
            console.error(`utils.js: Error updating account expiry for account: ${accountNumber}, Error: ${JSON.stringify(updatedAccountError)}`);
            return null;
        }

        console.log(`utils.js: Account expiry updated successfully for account: ${accountNumber}`);

        // Update voucher as used
        const { error: updatedVoucherError } = await supabase
            .from('vouchers')
            .update({
                is_used: true,
                associated_account: accountNumber,
                used_at: new Date().toISOString().replace(/\.\d{3}/, '')
            })
            .eq('code', voucherCode);

        if (updatedVoucherError) {
            console.error(`utils.js: Error updating voucher for code: ${voucherCode}, Error: ${JSON.stringify(updatedVoucherError)}`);
            return null;
        }

        console.log(`utils.js: Voucher updated successfully for code: ${voucherCode}`);
        
        return { newExpiry: formattedNewExpiry };
    } catch (error) {
        console.error(`utils.js: Exception occurred in redeemVoucher: ${error.message}`);
        return null;
    }
}


// Function to generate a SHA-256 token and return it with an expiry date
async function generateToken(accountNumber) {
    console.log(`Starting token generation process for account number: ${accountNumber}`);

    // Generate and store SHA-256 token
    console.log('Calling generateAndStoreToken to create a new SHA-256 token.');
    const tokenData = await generateAndStoreToken(accountNumber);  // Ensure you pass the accountNumber
    if (!tokenData) {
        console.error('Failed to generate SHA-256 token');
        return null;
    }
    const sha256Token = tokenData.cryptotoken;
    console.log(`SHA-256 token generated and stored successfully: ${sha256Token}`);

    // Calculate expiry date (24 hours from now)
    console.log('Calculating expiry date for the token.');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    // Format the expiry date to match MV format (without milliseconds and with timezone offset)
    const formattedExpiryDate = expiryDate.toISOString().split('.')[0] + '+00:00';
    console.log(`Token expiry date set to: ${formattedExpiryDate}`);

    console.log('Token generation process completed successfully.');

    return { 
        access_token: sha256Token, 
        expiry: formattedExpiryDate 
    };
}


async function generateAndStoreToken(accountNumber) {
    console.log('Generating a new SHA-256 token.');

    // Generate a random SHA-256 hash
    const hash = crypto.createHash('sha256').update(crypto.randomBytes(20)).digest('hex');
    const token = `mva_${hash}`;
    console.log(`Generated token: ${token}`);

    // Check if the token already exists in the database
    console.log('Checking if the token already exists in the database.');
    let { data: existingTokens, error } = await supabase
        .from('accounts')
        .select('cryptotoken')
        .eq('cryptotoken', token);

    if (error) {
        console.error('Error checking for existing token:', error.message);
        return;
    }

    // If any token is found with this hash, it's not available
    if (existingTokens.length > 0) {
        console.log('Token already exists. Generating a new one.');
        return generateAndStoreToken(accountNumber);
    }

    console.log(`Updating token in database for account number: ${accountNumber}`);
    const { data: updatedData, error: updateError } = await supabase
        .from('accounts')
        .update({ cryptotoken: token })
        .eq('account_number', accountNumber)
        .select();

    if (updateError) {
        console.error('Error updating token:', updateError.message);
        return;
    }

    if (updatedData && updatedData.length > 0) {
        console.log('Token updated successfully:', updatedData);
        return { cryptotoken: token };
    } else {
        console.log(`No data returned on update. Data: ${JSON.stringify(updatedData)}, Account Number: ${accountNumber}`);
    }
}


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

async function insertAccount(accountNumber) {
    console.log(`utils.js: Attempting to insert account with number: ${accountNumber}`);

    // Calculate the expiry date to be 24 hours from now
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);

    try {
        const { data: insertData, error: insertError } = await supabase
            .from('accounts')
            .insert([{ 
                account_number: accountNumber,
                expiry: expiry.toISOString() // Set the expiry time
            }])
            .single()
            .select('*'); 

        if (insertError) {
            console.error(`utils.js: Error inserting account:`, insertError);
            throw insertError;
        }

        console.log(`utils.js: Inserted account with 24-hour trial:`, insertData);
        return { data: insertData };
    } catch (error) {
        console.error(`utils.js: Exception when inserting account:`, error);
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
            .select(); 

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







// Function to authenticate with token
async function authenticateWithToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(`utils.js: Received token for authentication: ${token}`);

    if (!token) {
        console.log('utils.js: No token provided in request');
        return res.status(401).send('No token provided');
    }

    try {
        console.log(`utils.js: Validating token against database: ${token}`);
        const { data, error } = await supabase
            .from('accounts')
            .select('account_number')
            .eq('cryptotoken', token);

        console.log(`utils.js: Response from token validation: Data - ${JSON.stringify(data)}, Error - ${JSON.stringify(error)}`);

        if (error) {
            console.error('utils.js: Error validating token:', error.message);
            return res.status(500).send('Error validating token');
        }

        if (data && data.length > 0) {
            console.log(`utils.js: Token validated successfully. Account number: ${data[0].account_number}`);
            req.user = { accountNumber: data[0].account_number,token: token  };
            next();
        } else {
            console.log('utils.js: Invalid token: No matching account found');
            res.status(403).send('Invalid token');
        }
    } catch (err) {
        console.error('utils.js: Exception when validating token:', err.message);
        res.status(500).send('Error validating token');
    }
}










module.exports = {
    formatDate,
    generateAccountNumber,
    checkAccountExists,
    insertAccount,
    generateToken,
    insertDevice,
    utilsEmitter,
    getRandomFunnyWords,
    allocateIpV4Address,
    checkMaxDevicesReached,
    generateAndStoreToken,
    authenticateWithToken,
    validateVoucher,
    redeemVoucher,
    verifyAppleReceipt,
    getCurrentExpiry,
    addTimeToExpiry
};

