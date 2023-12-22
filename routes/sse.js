// sse.js
const express = require('express');
const router = express.Router();
const { utilsEmitter } = require('../utils');
const dbManager = require('../databaseManager'); // Importing the database manager

// SSE endpoint
router.get('/events', (req, res) => {
    const clientIP = req.ip;
    console.log(`SSE connection attempt from IP: ${clientIP}`);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onInternalEvent = (data) => {
        console.log('Sending event to client:', data);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    utilsEmitter.on('update', onInternalEvent);

    // Subscribe to Supabase Realtime changes
    const channel = dbManager.supabase
        .channel('public-devices')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sse_updates' },
            (payload) => {
                console.log(`Received update from Supabase: ${JSON.stringify(payload)}`);
                utilsEmitter.emit('update', { type: payload.eventType, data: payload.new });
            }
        )
        .subscribe((error) => {
            if (error) {
                console.error('Error subscribing to Supabase channel:', error);
            } else {
                console.log('Successfully subscribed to Supabase channel.');
            }
        });

    // Handle client disconnection
    req.on('close', () => {
        console.log(`SSE connection closed by client: ${clientIP}`);
        utilsEmitter.off('update', onInternalEvent);
        channel.unsubscribe().catch((error) => {
            console.error('Error unsubscribing from Supabase channel:', error.message);
        });
    });
});

module.exports = router;

