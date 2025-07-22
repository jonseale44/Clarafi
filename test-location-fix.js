// Test script to verify location assignment fix
const fetch = require('node-fetch');

async function testLocationAssignment() {
  console.log('Testing location assignment functionality...\n');
  
  // Test 1: Get locations for health system 1 (Parkland)
  console.log('Test 1: Checking locations for Parkland Family Medicine Clinic');
  const parklandLocations = await fetch('http://localhost:5000/api/test/locations/1');
  const parklandData = await parklandLocations.json();
  console.log('Locations found:', parklandData.length);
  parklandData.forEach(loc => {
    console.log(`  - ${loc.name} (${loc.location_type})`);
  });
  
  // Test 2: Get locations for health system 2 (Waco)
  console.log('\nTest 2: Checking locations for Waco Family Medicine');
  const wacoLocations = await fetch('http://localhost:5000/api/test/locations/2');
  const wacoData = await wacoLocations.json();
  console.log('Locations found:', wacoData.length);
  wacoData.forEach(loc => {
    console.log(`  - ${loc.name} (${loc.location_type})`);
  });
  
  // Test 3: Get user location assignments
  console.log('\nTest 3: Checking user location assignments');
  const userLocations = await fetch('http://localhost:5000/api/test/user-locations');
  const userData = await userLocations.json();
  console.log('User location assignments:', userData.length);
  userData.forEach(assignment => {
    console.log(`  - User ${assignment.username} → ${assignment.location_name || 'No location assigned'}`);
  });
  
  console.log('\nTest complete!');
}

// Add test endpoint to routes
const testRouter = require('express').Router();

testRouter.get('/api/test/locations/:healthSystemId', async (req, res) => {
  const { db } = require('./server/db.js');
  const { locations } = require('./shared/schema');
  const { eq } = require('drizzle-orm');
  
  const healthSystemId = parseInt(req.params.healthSystemId);
  const result = await db
    .select()
    .from(locations)
    .where(eq(locations.healthSystemId, healthSystemId));
  
  res.json(result);
});

testRouter.get('/api/test/user-locations', async (req, res) => {
  const { db } = require('./server/db.js');
  const { users, userLocations, locations } = require('./shared/schema');
  const { eq } = require('drizzle-orm');
  
  const result = await db
    .select({
      username: users.username,
      location_name: locations.name
    })
    .from(users)
    .leftJoin(userLocations, eq(users.id, userLocations.userId))
    .leftJoin(locations, eq(userLocations.locationId, locations.id));
  
  res.json(result);
});

module.exports = { testLocationAssignment, testRouter };