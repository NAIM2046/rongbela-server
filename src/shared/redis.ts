import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL as string;

if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in .env file');
}

const redis = new Redis(redisUrl, {
  // Upstash বা Serverless Redis এর জন্য এই অপশনটি false করতে হয়
  enableReadyCheck: false, 
  
  // SSL কনফিগারেশন
  tls: redisUrl.startsWith('rediss://') 
    ? { rejectUnauthorized: false } 
    : undefined 
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export default redis;