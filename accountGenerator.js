// accountGenerator.js

const { v4: uuidv4 } = require('uuid');

function generateUniqueAccountNumber() {
    return uuidv4(); // Generates a unique UUID
}

module.exports = {
    generateUniqueAccountNumber
};

