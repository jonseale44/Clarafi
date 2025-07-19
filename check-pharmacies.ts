import { db } from './server/db.js';
import { pharmacies } from './shared/schema.js';

async function checkPharmacies() {
  console.log('Checking pharmacy data...');
  
  const allPharmacies = await db.select().from(pharmacies);
  console.log(`Total pharmacies in database: ${allPharmacies.length}`);
  
  if (allPharmacies.length === 0) {
    console.log('\nNo pharmacies found! Let me add some sample pharmacies...');
    
    // Add some sample pharmacies
    const samplePharmacies = [
      {
        name: 'CVS Pharmacy',
        address: '123 Main Street',
        city: 'Waco',
        state: 'TX',
        zipCode: '76701',
        phone: '(254) 555-0100',
        fax: '(254) 555-0101',
        pharmacyType: 'retail',
        acceptsEprescribe: true,
        acceptsControlled: true,
        acceptsCompounding: false,
        hours: 'Mon-Fri: 9AM-9PM, Sat: 9AM-6PM, Sun: 10AM-5PM',
        active: true
      },
      {
        name: 'Walgreens',
        address: '456 Oak Avenue',
        city: 'Waco',
        state: 'TX',
        zipCode: '76702',
        phone: '(254) 555-0200',
        fax: '(254) 555-0201',
        pharmacyType: 'retail',
        acceptsEprescribe: true,
        acceptsControlled: true,
        acceptsCompounding: false,
        hours: 'Mon-Sun: 8AM-10PM',
        active: true
      },
      {
        name: 'HEB Pharmacy',
        address: '789 Valley Mills Dr',
        city: 'Waco',
        state: 'TX',
        zipCode: '76710',
        phone: '(254) 555-0300',
        fax: '(254) 555-0301',
        pharmacyType: 'retail',
        acceptsEprescribe: true,
        acceptsControlled: false,
        acceptsCompounding: false,
        hours: 'Mon-Sat: 8AM-9PM, Sun: 9AM-7PM',
        active: true
      },
      {
        name: 'Compounding Pharmacy of Waco',
        address: '321 Specialty Lane',
        city: 'Waco',
        state: 'TX',
        zipCode: '76705',
        phone: '(254) 555-0400',
        fax: '(254) 555-0401',
        pharmacyType: 'specialty',
        acceptsEprescribe: true,
        acceptsControlled: true,
        acceptsCompounding: true,
        hours: 'Mon-Fri: 9AM-6PM',
        active: true
      },
      {
        name: 'MedCare Pharmacy',
        address: '555 Healthcare Blvd',
        city: 'Temple',
        state: 'TX',
        zipCode: '76502',
        phone: '(254) 555-0500',
        fax: '(254) 555-0501',
        pharmacyType: 'hospital',
        acceptsEprescribe: true,
        acceptsControlled: true,
        acceptsCompounding: false,
        hours: 'Mon-Fri: 7AM-7PM, Sat: 8AM-5PM',
        active: true
      }
    ];
    
    for (const pharmacy of samplePharmacies) {
      await db.insert(pharmacies).values(pharmacy);
      console.log(`Added: ${pharmacy.name} in ${pharmacy.city}, ${pharmacy.state}`);
    }
    
    console.log('\n✅ Sample pharmacies added successfully!');
  } else {
    console.log('\nExisting pharmacies:');
    allPharmacies.forEach(p => {
      console.log(`- ${p.name} (${p.city}, ${p.state}) - Active: ${p.active}`);
    });
  }
  
  process.exit(0);
}

checkPharmacies().catch(console.error);