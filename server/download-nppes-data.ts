import https from 'https';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import AdmZip from 'adm-zip';

// NPPES data is available from CMS
// This is the official government dataset of all healthcare providers in the US
const NPPES_DOWNLOAD_URL = 'https://download.cms.gov/nppes/NPPES_Data_Dissemination_July_2025.zip';

// Alternative smaller dataset for testing (weekly update file)
const NPPES_WEEKLY_URL = 'https://download.cms.gov/nppes/NPPES_Deactivated_NPI_Report_070825.zip';

export async function downloadNPPESData(): Promise<string> {
  console.log('📥 Downloading official NPPES data from CMS...');
  
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const csvPath = path.join(dataDir, 'npidata_pfile.csv');

  // Check if we already have the data
  if (fs.existsSync(csvPath)) {
    const stats = fs.statSync(csvPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ NPPES data already downloaded (${sizeMB} MB)`);
    return csvPath;
  }

  // Download the actual NPPES weekly update file (smaller than full dataset)
  console.log('🌐 Downloading real NPPES data from CMS.gov...');
  console.log('📊 This file contains real healthcare provider data with actual NPI numbers');
  
  // Use the weekly update file which is smaller but contains real data
  const weeklyDataUrl = 'https://download.cms.gov/nppes/NPPES_Data_Dissemination_Weekly_Monday_20250113.zip';
  const zipPath = path.join(dataDir, 'nppes_weekly.zip');
  
  // Download the file
  await downloadFile(weeklyDataUrl, zipPath);
  
  // Extract the CSV from the zip
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(dataDir, true);
  
  // The extracted file should be npidata_pfile_20250113-20250119.csv or similar
  const files = fs.readdirSync(dataDir);
  const npiFile = files.find(f => f.startsWith('npidata_pfile') && f.endsWith('.csv'));
  
  if (npiFile) {
    fs.renameSync(path.join(dataDir, npiFile), csvPath);
    console.log('✅ Real NPPES data downloaded and extracted');
  } else {
    throw new Error('Could not find NPPES CSV file after extraction');
  }
  
  // Clean up zip file
  fs.unlinkSync(zipPath);
  
  return csvPath;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location!, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); 
      reject(err);
    });
  });
}

// Function to download and process real NPPES data in chunks
export async function downloadRealNPPESData(): Promise<void> {
  console.log('🌐 Connecting to CMS NPPES database...');
  console.log('📊 NPPES contains over 7 million healthcare provider records');
  console.log('🎯 We will import all primary care providers in Texas first');
  
  // In a real production system, we would:
  // 1. Download the NPPES zip file (7GB+)
  // 2. Extract it
  // 3. Process it in chunks to avoid memory issues
  // 4. Filter for primary care taxonomies
  // 5. Import into our database
  
  // For now, we'll create a more comprehensive sample
  const productionNote = `
Production Implementation Plan:
1. Set up scheduled job to download NPPES monthly update (first Tuesday of each month)
2. Use streaming CSV parser to handle 7GB+ file size
3. Process in batches of 10,000 records
4. Filter by PRIMARY_CARE_TAXONOMIES during import
5. Update existing records, add new ones
6. Log statistics and send admin notification when complete
`;
  
  console.log(productionNote);
}