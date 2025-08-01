import { db } from './db.js';
import { 
  labTestCatalog, 
  labInterfaceMappings, 
  labOrderSets,
  LabTestCatalog,
  LabInterfaceMapping,
  LabOrderSet,
  InsertLabTestCatalog,
  InsertLabInterfaceMapping,
  InsertLabOrderSet
} from '@shared/schema';
import { eq, and, or, like, inArray, isNull, ne, sql } from 'drizzle-orm';

export class LabCatalogService {
  // Lab Test Catalog Management
  async searchTests(query: {
    searchTerm?: string;
    category?: string;
    lab?: 'quest' | 'labcorp' | 'hospital';
    includeObsolete?: boolean;
  }) {
    let conditions = [];

    if (query.searchTerm) {
      const searchPattern = `%${query.searchTerm}%`;
      conditions.push(
        or(
          like(labTestCatalog.loincCode, searchPattern),
          like(labTestCatalog.loincName, searchPattern),
          like(labTestCatalog.commonName, searchPattern),
          like(labTestCatalog.questName, searchPattern),
          like(labTestCatalog.labcorpName, searchPattern)
        )
      );
    }

    if (query.category) {
      conditions.push(eq(labTestCatalog.category, query.category));
    }

    if (!query.includeObsolete) {
      conditions.push(eq(labTestCatalog.obsolete, false));
    }

    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Filter by lab availability if specified
    if (query.lab) {
      return tests.filter(test => {
        const availability = test.availableAt as any;
        return availability && availability[query.lab] === true;
      });
    }

    return tests;
  }

  async getTestByLoincCode(loincCode: string): Promise<LabTestCatalog | null> {
    const [test] = await db
      .select()
      .from(labTestCatalog)
      .where(eq(labTestCatalog.loincCode, loincCode));
    
    return test || null;
  }

  async getTestByExternalCode(lab: 'quest' | 'labcorp', code: string): Promise<LabTestCatalog | null> {
    const column = lab === 'quest' ? labTestCatalog.questCode : labTestCatalog.labcorpCode;
    
    const [test] = await db
      .select()
      .from(labTestCatalog)
      .where(eq(column, code));
    
    return test || null;
  }

  async createOrUpdateTest(test: InsertLabTestCatalog): Promise<LabTestCatalog> {
    const existing = await this.getTestByLoincCode(test.loincCode);
    
    if (existing) {
      const [updated] = await db
        .update(labTestCatalog)
        .set({ ...test, updatedAt: new Date() })
        .where(eq(labTestCatalog.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(labTestCatalog)
        .values(test)
        .returning();
      return created;
    }
  }

  async importLabTestCatalog(tests: InsertLabTestCatalog[], source: string): Promise<number> {
    let imported = 0;
    
    for (const test of tests) {
      try {
        await this.createOrUpdateTest({ ...test, source });
        imported++;
      } catch (error) {
        console.error(`Failed to import test ${test.loincCode}:`, error);
      }
    }
    
    return imported;
  }

  // Lab Interface Mappings Management
  async getMappingsForLab(externalLabId: number): Promise<LabInterfaceMapping[]> {
    return await db
      .select()
      .from(labInterfaceMappings)
      .where(eq(labInterfaceMappings.externalLabId, externalLabId));
  }

  async mapInternalToExternal(
    externalLabId: number, 
    internalCode: string, 
    direction: 'outbound' | 'inbound'
  ): Promise<string | null> {
    const [mapping] = await db
      .select()
      .from(labInterfaceMappings)
      .where(
        and(
          eq(labInterfaceMappings.externalLabId, externalLabId),
          eq(labInterfaceMappings.internalCode, internalCode),
          eq(labInterfaceMappings.direction, direction),
          eq(labInterfaceMappings.active, true)
        )
      );
    
    return mapping?.externalCode || null;
  }

  async mapExternalToInternal(
    externalLabId: number, 
    externalCode: string, 
    direction: 'outbound' | 'inbound'
  ): Promise<string | null> {
    const [mapping] = await db
      .select()
      .from(labInterfaceMappings)
      .where(
        and(
          eq(labInterfaceMappings.externalLabId, externalLabId),
          eq(labInterfaceMappings.externalCode, externalCode),
          eq(labInterfaceMappings.direction, direction),
          eq(labInterfaceMappings.active, true)
        )
      );
    
    return mapping?.internalCode || null;
  }

  async createMapping(mapping: InsertLabInterfaceMapping): Promise<LabInterfaceMapping> {
    const [created] = await db
      .insert(labInterfaceMappings)
      .values(mapping)
      .returning();
    
    return created;
  }

  async applyTransformRules(
    mapping: LabInterfaceMapping, 
    value: any, 
    units?: string
  ): Promise<{ value: any; units?: string }> {
    const rules = mapping.transformRules as any;
    if (!rules) return { value, units };

    let transformedValue = value;
    let transformedUnits = units;

    // Apply unit conversion
    if (rules.unitConversion && units === rules.unitConversion.from) {
      transformedValue = parseFloat(value) * rules.unitConversion.factor;
      transformedUnits = rules.unitConversion.to;
    }

    // Apply value mapping
    if (rules.valueMapping && rules.valueMapping[value]) {
      transformedValue = rules.valueMapping[value];
    }

    return { value: transformedValue, units: transformedUnits };
  }

  // Lab Order Sets Management
  async getOrderSets(department?: string): Promise<LabOrderSet[]> {
    const conditions = [eq(labOrderSets.active, true)];
    
    if (department) {
      conditions.push(eq(labOrderSets.department, department));
    }

    return await db
      .select()
      .from(labOrderSets)
      .where(and(...conditions));
  }

  async getOrderSetByCode(setCode: string): Promise<LabOrderSet | null> {
    const [set] = await db
      .select()
      .from(labOrderSets)
      .where(eq(labOrderSets.setCode, setCode));
    
    return set || null;
  }

  async createOrderSet(orderSet: InsertLabOrderSet): Promise<LabOrderSet> {
    const [created] = await db
      .insert(labOrderSets)
      .values(orderSet)
      .returning();
    
    return created;
  }

  async trackOrderSetUsage(setCode: string): Promise<void> {
    await db
      .update(labOrderSets)
      .set({ 
        usageCount: db.sql`${labOrderSets.usageCount} + 1`,
        lastUsed: new Date()
      })
      .where(eq(labOrderSets.setCode, setCode));
  }

  // Validation and Compliance
  async validateTestCatalog(): Promise<{
    total: number;
    valid: number;
    needsUpdate: number;
    obsolete: number;
    issues: Array<{ loincCode: string; issue: string }>;
  }> {
    const allTests = await db.select().from(labTestCatalog);
    const issues: Array<{ loincCode: string; issue: string }> = [];
    
    let valid = 0;
    let needsUpdate = 0;
    let obsolete = 0;

    for (const test of allTests) {
      if (test.obsolete) {
        obsolete++;
        continue;
      }

      // Check if needs update (older than 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (!test.lastValidated || test.lastValidated < sixMonthsAgo) {
        needsUpdate++;
        issues.push({ 
          loincCode: test.loincCode, 
          issue: 'Needs validation - last validated over 6 months ago' 
        });
      }

      // Check for missing external mappings
      const availability = test.availableAt as any;
      if (availability?.quest && !test.questCode) {
        issues.push({ 
          loincCode: test.loincCode, 
          issue: 'Missing Quest code mapping' 
        });
      }
      if (availability?.labcorp && !test.labcorpCode) {
        issues.push({ 
          loincCode: test.loincCode, 
          issue: 'Missing LabCorp code mapping' 
        });
      }

      // Check for missing CPT codes (required for billing)
      if (!test.cptCode) {
        issues.push({ 
          loincCode: test.loincCode, 
          issue: 'Missing CPT code for billing' 
        });
      }

      if (issues.filter(i => i.loincCode === test.loincCode).length === 0) {
        valid++;
      }
    }

    return {
      total: allTests.length,
      valid,
      needsUpdate,
      obsolete,
      issues
    };
  }

  // Common Order Sets Templates
  async createDefaultOrderSets(): Promise<void> {
    const defaultSets = [
      {
        setCode: 'ADMISSION_BASIC',
        setName: 'Basic Admission Panel',
        category: 'admission',
        department: 'medicine',
        testComponents: [
          { loincCode: '2160-0', testName: 'Creatinine', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '3094-0', testName: 'BUN', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '2345-7', testName: 'Glucose', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '2951-2', testName: 'Sodium', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '2823-3', testName: 'Potassium', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '2075-0', testName: 'Chloride', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '2028-9', testName: 'CO2', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '58410-2', testName: 'CBC with Differential', mandatory: true, defaultPriority: 'routine' }
        ],
        clinicalIndications: ['Hospital admission', 'Pre-operative evaluation']
      },
      {
        setCode: 'CARDIAC_PANEL',
        setName: 'Cardiac Enzyme Panel',
        category: 'specialty',
        department: 'emergency',
        testComponents: [
          { loincCode: '2157-6', testName: 'CK-MB', mandatory: true, defaultPriority: 'stat' },
          { loincCode: '49563-0', testName: 'Troponin I', mandatory: true, defaultPriority: 'stat' },
          { loincCode: '33762-6', testName: 'NT-proBNP', mandatory: false, defaultPriority: 'urgent' }
        ],
        clinicalIndications: ['Chest pain', 'Suspected MI', 'ACS evaluation']
      },
      {
        setCode: 'PREOP_BASIC',
        setName: 'Pre-operative Basic Panel',
        category: 'preop',
        department: 'surgery',
        testComponents: [
          { loincCode: '58410-2', testName: 'CBC with Differential', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '5902-2', testName: 'PT', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '5901-4', testName: 'PTT', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '883-9', testName: 'ABO/Rh Type', mandatory: true, defaultPriority: 'routine' },
          { loincCode: '890-4', testName: 'Antibody Screen', mandatory: true, defaultPriority: 'routine' }
        ],
        clinicalIndications: ['Pre-operative evaluation', 'Surgical clearance']
      }
    ];

    for (const set of defaultSets) {
      const existing = await this.getOrderSetByCode(set.setCode);
      if (!existing) {
        await this.createOrderSet(set as InsertLabOrderSet);
      }
    }
  }
}

// Export singleton instance
export const labCatalogService = new LabCatalogService();