/**
 * Test Chart Medication Management with GPT Intelligence
 * Tests the enhanced medication-delta-service with new chart medication capabilities
 */

const API_BASE = 'http://localhost:5000';

async function testChartMedicationManagement() {
    console.log('🧪 Testing Enhanced Chart Medication Management with GPT Intelligence');
    console.log('===============================================================');

    try {
        // Test 1: Add new medication to chart
        console.log('\n🔬 Test 1: Adding new medication to chart...');
        const addResponse = await fetch(`${API_BASE}/api/patients/37/chart-medications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'session=test-session' // You'll need actual session
            },
            body: JSON.stringify({
                medicationName: 'Lisinopril',
                dosage: '10 mg',
                frequency: 'once daily',
                route: 'oral',
                quantity: 30,
                daysSupply: 30,
                refills: 5,
                sig: 'Take 1 tablet by mouth once daily',
                clinicalIndication: 'Hypertension',
                startDate: new Date().toISOString().split('T')[0]
            })
        });

        if (addResponse.ok) {
            const result = await addResponse.json();
            console.log('✅ Successfully added medication:', result.medication.medicationName);
            console.log('🤖 GPT Analysis:', result.gptAnalysis.reasoning);
        } else {
            const error = await addResponse.json();
            if (error.duplicateDetected) {
                console.log('⚠️ GPT detected duplicate:', error.reasoning);
                console.log('💡 Recommendations:', error.recommendations);
            } else {
                console.log('❌ Error adding medication:', error.error);
            }
        }

        // Test 2: Search formulary
        console.log('\n🔬 Test 2: Searching medication formulary...');
        const searchResponse = await fetch(`${API_BASE}/api/medications/formulary/search?q=metformin&limit=5`, {
            headers: {
                'Cookie': 'session=test-session'
            }
        });

        if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            console.log(`✅ Found ${searchResult.count} formulary matches for "${searchResult.query}"`);
            searchResult.results.forEach((med, i) => {
                console.log(`   ${i + 1}. ${med.genericName} (${med.brandNames?.join(', ') || 'Generic'})`);
            });
        } else {
            console.log('❌ Error searching formulary');
        }

        // Test 3: Get enhanced medications for patient
        console.log('\n🔬 Test 3: Retrieving enhanced medications list...');
        const listResponse = await fetch(`${API_BASE}/api/patients/37/medications-enhanced`, {
            headers: {
                'Cookie': 'session=test-session'
            }
        });

        if (listResponse.ok) {
            const medications = await listResponse.json();
            console.log(`✅ Retrieved ${medications.length} medications`);
            
            if (medications.length > 0) {
                const firstMed = medications[0];
                console.log(`   Example: ${firstMed.medicationName} ${firstMed.dosage} ${firstMed.frequency}`);
                
                // Test 4: Move medication to orders
                console.log('\n🔬 Test 4: Moving medication to orders...');
                const moveResponse = await fetch(`${API_BASE}/api/medications/${firstMed.id}/move-to-orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': 'session=test-session'
                    },
                    body: JSON.stringify({
                        encounterId: 96, // Use existing encounter
                        quantity: 90,
                        daysSupply: 90,
                        refills: 3,
                        clinicalIndication: 'Refill for ongoing therapy'
                    })
                });

                if (moveResponse.ok) {
                    const moveResult = await moveResponse.json();
                    console.log('✅ Successfully moved medication to orders');
                    console.log(`   Created order ID: ${moveResult.draftOrder.id}`);
                    console.log(`   Refill data: ${moveResult.refillData.quantity} tablets, ${moveResult.refillData.daysSupply} days`);
                } else {
                    console.log('❌ Error moving medication to orders');
                }
            }
        } else {
            console.log('❌ Error retrieving medications');
        }

        console.log('\n🎯 Chart Medication Management Test Complete!');
        console.log('===============================================');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testChartMedicationManagement();