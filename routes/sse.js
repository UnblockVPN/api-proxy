const express = require('express');
const router = express.Router();
const { utilsEmitter } = require('../utils');
const dbManager = require('../databaseManager'); // Importing the database manager

// SSE endpoint
router.get('/events', (req, res) => {
    const clientIP = req.ip;
    
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
            { schema: 'public', table: 'sse_updates' },
            (payload) => {
                console.log(`Received update from Supabase: ${JSON.stringify(payload)}`);

                // Check the event type and emit accordingly
                if (payload.eventType === 'INSERT') {
                    utilsEmitter.emit('update', { type: 'INSERT', data: payload.new });
                } else if (payload.eventType === 'UPDATE') {
                    utilsEmitter.emit('update', { type: 'UPDATE', data: payload.new });
                } else if (payload.eventType === 'DELETE') {
                    utilsEmitter.emit('update', { type: 'DELETE', data: payload.old });
                }
            }
        )
        .subscribe((error) => {
            if (error) {
                // Handle subscription error if needed
                console.error('Error subscribing to Supabase channel:', error);
            } else {
                console.log('Successfully subscribed to Supabase channel.');
            }
        });

    // Handle client disconnection
    req.on('close', () => {
        // Clean up event listeners and unsubscribe from Supabase channel
        utilsEmitter.off('update', onInternalEvent);
        channel.unsubscribe().catch((error) => {
            console.error('Error unsubscribing from Supabase channel:', error.message);
        });
    });
});

module.exports = router;
