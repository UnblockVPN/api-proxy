const jwt = require('jsonwebtoken');

// Replace 'YourTokenHere' with your actual token
//const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MDE5MzU2MjcsImV4cCI6MTcwMjAyMjAyN30.60AssnhJ1W8aMi8Xh4m1AOdhKEjq--URgtq6CT3pWcs';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50TnVtYmVyIjp7ImFjY291bnRJZCI6IjExMzk0MzM1NjM0MjU0MjgifSwiaWF0IjoxNzAxOTY0MzMyLCJleHAiOjE3MDIwNTA3MzJ9.n0JN7maB8sXnG3pTa6Ldsfckq5qk--yswhE4K6o27Qg';
// Replace 'YourSecretKey' with your actual secret key
const secret = '2ce8833870668bcfc94aee9b3cb689771dabea0681480b4a424f639b4bb45ab4a209584a863259f051568d3433ccf332cb59315ba4aa150f0badaf5081841591';

try {
    const decoded = jwt.verify(token, secret);
    console.log('Decoded JWT:', decoded);
} catch (error) {
    console.error('Error decoding token:', error.message);
}
