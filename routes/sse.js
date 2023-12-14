//events.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { utilsEmitter } = require('../utils');


// SSE endpoint
router.get('/events', (req, res) => {
    console.log('SSE connection established');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Set up event listener for internal events
    const onInternalEvent = (data) => {
        console.log('Sending event to client:', data);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    utilsEmitter.on('update', onInternalEvent);

    // Subscribe to Supabase channel for table changes
    const channel = supabase
        .channel('public-devices') // Replace with your channel name
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sse_updates' },
            (payload) => {
                console.log('Supabase change event:', payload);
                utilsEmitter.emit('update', { type: payload.eventType, data: payload.new });
            }
        )
        .subscribe((error) => {
            if (error) console.error('Error subscribing to Supabase channel:', error);
        });

    // Handle client disconnection
    req.on('close', () => {
        console.log('Client disconnected from SSE');
        utilsEmitter.off('update', onInternalEvent);
        channel.unsubscribe();
    });
});

module.exports = router;
