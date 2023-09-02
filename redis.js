const { createClient } = require('redis');

const redisClient = createClient();

redisClient.on('error', err => console.log('Redis Client Error', err));

redisClient.connect().then(_ => console.log('connected'))