local entries = redis.call('HGETALL', KEYS[1])
for i = 1, #entries, 2 do
    redis.call('HSET', KEYS[2], entries[i + 1], entries[i])
end
