# AWS Deployment Troubleshooting Guide

## Current Issues
1. **503 Service Unavailable** on `/api/login` - "upstream c..." error from Envoy proxy
2. **404 Not Found** on `/api/health-systems/public` - Route not accessible
3. Registration form shows "Error checking username" and "Error checking email"

## These errors indicate your backend server is not running or not accessible in AWS

## Diagnostic Steps

### 1. Check if your backend is running
```bash
# SSH into your AWS instance and check if Node.js process is running
ps aux | grep node

# Check application logs
tail -f /var/log/your-app-name.log

# Check if the app is listening on the expected port
netstat -tlnp | grep :5000  # or whatever PORT you configured
```

### 2. Test the health check endpoints directly on the server
```bash
# From inside your AWS instance
curl http://localhost:5000/health
curl http://localhost:5000/api/health
curl http://localhost:5000/api/test
```

### 3. Check environment variables
Your app needs these environment variables set:
- `PORT` - The port your app should listen on (AWS App Runner typically uses 8000)
- `DATABASE_URL` - Your PostgreSQL connection string
- `NODE_ENV` - Should be "production"
- `OPENAI_API_KEY` - For AI features
- Any other API keys your app uses

### 4. Common AWS-specific issues

#### AWS App Runner
If using App Runner, ensure:
- Port configuration matches (App Runner expects port 8000 by default)
- Health check path is configured correctly in App Runner settings
- Environment variables are set in App Runner configuration

#### AWS ECS/Fargate
If using ECS:
- Task definition has correct port mappings
- Security groups allow traffic on your application port
- Target group health checks are configured correctly
- Container logs show the app starting successfully

#### AWS EC2 with Load Balancer
If using EC2:
- Security groups allow traffic between ALB and EC2 instances
- Target group health checks use the correct port and path
- Instance is in a healthy state in the target group

### 5. Quick fixes to try

1. **Update your start script** to ensure proper port binding:
```javascript
// In your server startup code
const port = process.env.PORT || 8000;  // AWS often expects 8000
```

2. **Add more detailed error logging** at startup:
```javascript
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit in production - let health checks fail instead
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

3. **Verify database connection**:
The app might be failing to start due to database connection issues. Check:
- DATABASE_URL is correct
- Database is accessible from your AWS environment
- Security groups allow connection to the database

### 6. Test with simplified deployment

Try deploying a minimal version first:
1. Comment out database initialization in your startup
2. Deploy just with health check endpoints working
3. Once that works, add back features one by one

### 7. AWS-specific configuration

Make sure your `package.json` start script works for production:
```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "tsc && vite build"
  }
}
```

### 8. Check build output

Ensure your build process:
1. Compiles TypeScript correctly
2. Includes all necessary files
3. Has all dependencies in `package.json` (not devDependencies)

## Next Steps

1. SSH into your AWS instance and check the logs
2. Verify environment variables are set
3. Test health endpoints directly on the server
4. Check if the port configuration matches AWS expectations
5. Look for any startup errors in the logs

The key issue is that your backend server is not accessible to the load balancer. Once you get the health check endpoints working (`/health` or `/api/health`), the other endpoints should work too.