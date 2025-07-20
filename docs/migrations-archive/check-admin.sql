SELECT id, username, email, health_system_id, created_at 
FROM users 
WHERE role = 'admin' 
ORDER BY created_at DESC 
LIMIT 5;
