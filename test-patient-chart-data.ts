import { PatientChartService } from './server/patient-chart-service.js';

async function testPatientChartData() {
  console.log('Testing PatientChartService for patient 5 (Jennifer Sweet)...\n');
  
  try {
    const chartData = await PatientChartService.getPatientChartData(5);
    
    console.log('Chart Data Retrieved:');
    console.log('- Demographics:', chartData.demographics);
    console.log('- Active Problems:', chartData.activeProblems?.length || 0);
    console.log('- Medical Problems:', chartData.medicalProblems?.length || 0);
    console.log('- Current Medications:', chartData.currentMedications?.length || 0);
    console.log('- Allergies:', chartData.allergies?.length || 0);
    console.log('- Vitals:', chartData.vitals?.length || 0);
    console.log('- Family History:', chartData.familyHistory?.length || 0);
    console.log('- Social History:', chartData.socialHistory?.length || 0);
    console.log('- Imaging Results:', chartData.imagingResults?.length || 0);
    
    console.log('\nMedications Detail:');
    if (chartData.currentMedications?.length > 0) {
      chartData.currentMedications.forEach((med: any) => {
        console.log(`  - ${med.medicationName} ${med.dosage} ${med.frequency || ''}`);
      });
    } else {
      console.log('  No medications found!');
    }
    
    console.log('\nMedical Problems Detail:');
    if (chartData.medicalProblems?.length > 0) {
      chartData.medicalProblems.slice(0, 5).forEach((problem: any) => {
        console.log(`  - ${problem.problemTitle || problem.problemDescription} (${problem.problemStatus})`);
      });
      if (chartData.medicalProblems.length > 5) {
        console.log(`  ... and ${chartData.medicalProblems.length - 5} more`);
      }
    } else {
      console.log('  No medical problems found!');
    }
    
  } catch (error) {
    console.error('Error testing PatientChartService:', error);
  }
  
  process.exit(0);
}

testPatientChartData();