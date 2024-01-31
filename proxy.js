//proxy.js
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const authRouter = require('./routes/auth');
const sseRouter = require('./routes/sse');
const accountsRouter = require('./routes/accounts');
const resourcesRouter = require('./routes/resources');
const checkIPRouter = require('./routes/check-ip');
const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());  // Middleware to parse JSON body for POST requests
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded data
app.use((req, res, next) => { // Middleware for logging
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    console.log(`Headers: `, req.headers);
    console.log(`Body: `, req.body);
    next(); // Continue to the next middleware or the request handler
});
// Routes
app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/app', resourcesRouter);
app.use('/sse', sseRouter);
app.use('/check-ip', checkIPRouter);
app.use((req, res) => {// Response for unimplemented routes
    res.status(501).send('API route does not exist');
});
app.listen(port, () => {
    console.log(`Api server running at http://localhost:${port}`);
});
module.exports = app;// Export the app for testing purposes
