// databaseManager.js
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let reconnectDelay = 1000; // Initial reconnect delay of 1 second
const maxReconnectDelay = 60000; // Max reconnect delay of 60 seconds
let heartbeatInterval;

function checkDatabaseHealth() {
    supabase
        .from('accounts')
        .select('id')
        .limit(1)
        .then(() => {
            console.log('Supabase is responsive');
        })
        .catch((error) => {
            console.error('Supabase check failed:', error.message);
            clearInterval(heartbeatInterval);
            startReconnectProcess();
        });
}

function startReconnectProcess() {
    reconnectToDatabase()
        .then(() => {
            console.log('Reconnected to Supabase successfully');
            resetReconnectLogic();
        })
        .catch(() => {
            console.log(`Supabase Reconnect attempt failed, retrying in ${reconnectDelay} ms`);
            setTimeout(startReconnectProcess, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
        });
}

function reconnectToDatabase() {
    return new Promise((resolve, reject) => {
        try {
            // Reinitialize the Supabase client
            supabase = createClient(supabaseUrl, supabaseKey);
            console.log('Attempting to reconnect to the Supabase...');
            // Perform a test query to ensure connectivity
            supabase
                .from('accounts')
                .select('id')
                .limit(1)
                .then(() => resolve())
                .catch((error) => reject(error));
        } catch (error) {
            reject(error);
        }
    });
}

function resetReconnectLogic() {
    reconnectDelay = 1000; // Reset delay
    heartbeatInterval = setInterval(checkDatabaseHealth, 10000); // Restart heartbeat
}

// Initialize heartbeat
heartbeatInterval = setInterval(checkDatabaseHealth, 10000);

module.exports = {
    checkDatabaseHealth,
    startReconnectProcess,
    resetReconnectLogic,
    supabase // Exporting supabase client for use in other modules
};
