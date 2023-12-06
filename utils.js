//utils.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to generate a JWT and set expiry date
function generateToken(user) {
    const payload = { userId: user.id }; // Customize the payload as needed
    const secret = process.env.JWT_SECRET;
    const options = { expiresIn: '24h' }; // Token expires in 24 hours
    const token = jwt.sign(payload, secret, options);

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
        return res.sendStatus(401); // No token provided
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
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
    const { data, error } = await supabase
        .from('accounts')
        .select('account_number, status') // Assuming there's a 'status' field
        .eq('account_number', accountNumber);

    if (error) throw error;

    if (data.length > 0) {
        const account = data[0];
        // Check if account is active, not cancelled or locked
        return account.status === 'active';
    }
    return false;
}

// Helper Function: Insert Account
async function insertAccount(accountNumber) {
    const { data, error } = await supabase
        .from('accounts')
        .insert([{ account_number: accountNumber }]);
    
    if (error) throw error;
    return data;
}



module.exports = {
    formatDate,
    generateAccountNumber,
    checkAccountExists,
    insertAccount,
    generateToken,
    authenticateToken
};

