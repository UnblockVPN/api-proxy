const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { utilsEmitter } = require('../utils');

// SSE endpoint
router.get('/events', (req, res) => {
    const clientIP = req.ip;
    
    // Check if the connection is from localhost (127.0.0.1 or ::1)
    if (clientIP === '127.0.0.1' || clientIP === '::1') {
        console.log(`SSE connection from localhost (${clientIP}) blocked.`);
        res.status(403).end(); // Return a forbidden status to block the connection
        return;
    }

    console.log(`SSE connection established from IP: ${clientIP}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onInternalEvent = (data) => {
        console.log('Sending event to client:', data);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    utilsEmitter.on('update', onInternalEvent);

    const channel = supabase
        .channel('public-devices')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sse_updates' },
            (payload) => {
                utilsEmitter.emit('update', { type: payload.eventType, data: payload.new });
            }
        )
        .subscribe((error) => {
            if (error) {
                console.error('Error subscribing to Supabase channel:', error);
                // Handle the error as needed
            }
        });

    req.on('close', () => {
        console.log('Client disconnected from SSE');
        utilsEmitter.off('update', onInternalEvent);
        channel.unsubscribe().catch((error) => {
            console.error('Error during unsubscription:', error.message);
        });
    });
});

module.exports = router;
