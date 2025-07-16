import { db } from "./db";
import { sql } from "drizzle-orm";

async function addTestHealthSystemsSQL() {
  try {
    console.log("📍 Adding test health systems using SQL...\n");
    
    // Add test health systems using raw SQL
    const queries = [
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Hillsboro Community Hospital', 'hospital', 2, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Hillsboro Family Medical Center', 'clinic_group', 2, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Austin Regional Clinic', 'multi_location_practice', 2, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Dallas Medical City', 'hospital_network', 3, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Hill Country Family Medicine - Hillsboro', 'clinic', 1, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Hillsboro Urgent Care', 'urgent_care', 1, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Houston Methodist', 'hospital_network', 3, 'active', true)
          ON CONFLICT (name) DO NOTHING`,
          
      sql`INSERT INTO health_systems (name, type, subscription_tier, subscription_status, active)
          VALUES ('Cedar Park Family Practice', 'clinic', 1, 'active', true)
          ON CONFLICT (name) DO NOTHING`
    ];
    
    let added = 0;
    for (const query of queries) {
      try {
        const result = await db.execute(query);
        if (result.rowCount && result.rowCount > 0) {
          added++;
          console.log(`✅ Added health system`);
        } else {
          console.log(`⚠️  Health system already exists`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    // Now add some locations for these health systems
    console.log(`\n📍 Adding locations for health systems...\n`);
    
    // First get the health system IDs
    const healthSystemsResult = await db.execute(
      sql`SELECT id, name FROM health_systems WHERE name IN (
        'Hillsboro Community Hospital',
        'Hillsboro Family Medical Center',
        'Austin Regional Clinic',
        'Dallas Medical City',
        'Hill Country Family Medicine - Hillsboro',
        'Hillsboro Urgent Care'
      )`
    );
    
    // Add locations for each health system
    for (const hs of healthSystemsResult.rows) {
      if (hs.name.toLowerCase().includes('hillsboro')) {
        await db.execute(
          sql`INSERT INTO locations (health_system_id, name, location_type, address, city, state, zip_code, phone, active)
              VALUES (${hs.id}, ${hs.name + ' - Main Campus'}, 'clinic', ${hs.id + ' Main Street'}, 'Hillsboro', 'TX', '76645', '(254) 555-' || ${1000 + Number(hs.id)}, true)
              ON CONFLICT DO NOTHING`
        );
        console.log(`✅ Added location for ${hs.name} in Hillsboro`);
      } else if (hs.name.includes('Austin')) {
        await db.execute(
          sql`INSERT INTO locations (health_system_id, name, location_type, address, city, state, zip_code, phone, active)
              VALUES (${hs.id}, ${hs.name + ' - North Austin'}, 'clinic', '1000 N Lamar Blvd', 'Austin', 'TX', '78701', '(512) 555-2001', true)
              ON CONFLICT DO NOTHING`
        );
        await db.execute(
          sql`INSERT INTO locations (health_system_id, name, location_type, address, city, state, zip_code, phone, active)
              VALUES (${hs.id}, ${hs.name + ' - South Austin'}, 'clinic', '2000 S Congress Ave', 'Austin', 'TX', '78704', '(512) 555-2002', true)
              ON CONFLICT DO NOTHING`
        );
        console.log(`✅ Added 2 locations for ${hs.name} in Austin`);
      } else if (hs.name.includes('Dallas')) {
        await db.execute(
          sql`INSERT INTO locations (health_system_id, name, location_type, address, city, state, zip_code, phone, active)
              VALUES (${hs.id}, ${hs.name + ' Hospital'}, 'hospital', '7777 Forest Lane', 'Dallas', 'TX', '75230', '(972) 566-7000', true)
              ON CONFLICT DO NOTHING`
        );
        console.log(`✅ Added location for ${hs.name} in Dallas`);
      }
    }
    
    console.log(`\n✅ Added ${added} new health systems!`);
    console.log("The location search should now show more options, especially when searching for 'Hillsboro'.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error adding health systems:", error);
    process.exit(1);
  }
}

addTestHealthSystemsSQL();