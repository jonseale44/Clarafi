import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { Patient, MedicalProblem, Medication, Allergy, VitalSigns, LabResult } from '../types';
import { apiClient } from '../services/api';

interface PatientChartScreenProps {
  navigation: any;
  route: any;
}

interface ChartData {
  patient?: Patient;
  medicalProblems: MedicalProblem[];
  medications: Medication[];
  allergies: Allergy[];
  vitalSigns: VitalSigns[];
  labResults: LabResult[];
}

export const PatientChartScreen: React.FC<PatientChartScreenProps> = ({ navigation, route }) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData>({
    medicalProblems: [],
    medications: [],
    allergies: [],
    vitalSigns: [],
    labResults: [],
  });

  useEffect(() => {
    loadPatientChart();
  }, [patientId]);

  const loadPatientChart = async () => {
    try {
      setLoading(true);
      
      // Load patient data
      const patient = await apiClient.getPatient(patientId);
      
      // TODO: Load all chart sections in parallel
      // For now, using mock data
      const mockData: ChartData = {
        patient,
        medicalProblems: [
          { id: 1, patientId, problemName: 'Hypertension', icdCode: 'I10', status: 'active' },
          { id: 2, patientId, problemName: 'Type 2 Diabetes', icdCode: 'E11.9', status: 'active' },
        ],
        medications: [
          { id: 1, patientId, medicationName: 'Lisinopril', dosage: '10mg', frequency: 'once daily', status: 'active' },
          { id: 2, patientId, medicationName: 'Metformin', dosage: '500mg', frequency: 'twice daily', status: 'active' },
        ],
        allergies: [
          { id: 1, patientId, allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate', status: 'active' },
        ],
        vitalSigns: [
          { 
            id: 1, 
            patientId, 
            recordedAt: new Date().toISOString(),
            bloodPressureSystolic: 145,
            bloodPressureDiastolic: 90,
            heartRate: 88,
            temperature: 98.6,
          },
        ],
        labResults: [
          {
            id: 1,
            patientId,
            testName: 'Hemoglobin A1c',
            resultValue: '7.2',
            unit: '%',
            referenceRange: '< 5.7',
            resultDate: new Date().toISOString(),
            status: 'final',
          },
        ],
      };

      setChartData(mockData);
    } catch (error) {
      console.error('Failed to load patient chart:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderAllergies = () => {
    if (chartData.allergies.length === 0) {
      return <Text style={styles.emptyText}>No known allergies</Text>;
    }
    
    return chartData.allergies.map((allergy) => (
      <View key={allergy.id} style={styles.itemCard}>
        <Text style={styles.itemTitle}>{allergy.allergen}</Text>
        {allergy.reaction && <Text style={styles.itemSubtext}>Reaction: {allergy.reaction}</Text>}
        {allergy.severity && (
          <Text style={[styles.severityBadge, styles[`severity${allergy.severity}`]]}>
            {allergy.severity.toUpperCase()}
          </Text>
        )}
      </View>
    ));
  };

  const renderMedicalProblems = () => {
    if (chartData.medicalProblems.length === 0) {
      return <Text style={styles.emptyText}>No active problems</Text>;
    }
    
    return chartData.medicalProblems.map((problem) => (
      <View key={problem.id} style={styles.itemCard}>
        <Text style={styles.itemTitle}>{problem.problemName}</Text>
        {problem.icdCode && <Text style={styles.itemSubtext}>ICD: {problem.icdCode}</Text>}
        <Text style={[styles.statusBadge, styles[`status${problem.status}`]]}>
          {problem.status.toUpperCase()}
        </Text>
      </View>
    ));
  };

  const renderMedications = () => {
    if (chartData.medications.length === 0) {
      return <Text style={styles.emptyText}>No active medications</Text>;
    }
    
    return chartData.medications.map((med) => (
      <View key={med.id} style={styles.itemCard}>
        <Text style={styles.itemTitle}>{med.medicationName}</Text>
        <Text style={styles.itemSubtext}>
          {med.dosage} - {med.frequency}
        </Text>
        {med.route && <Text style={styles.itemSubtext}>Route: {med.route}</Text>}
      </View>
    ));
  };

  const renderVitalSigns = () => {
    if (chartData.vitalSigns.length === 0) {
      return <Text style={styles.emptyText}>No vitals recorded</Text>;
    }
    
    const latest = chartData.vitalSigns[0];
    return (
      <View style={styles.vitalsGrid}>
        {latest.bloodPressureSystolic && (
          <View style={styles.vitalItem}>
            <Text style={styles.vitalLabel}>BP</Text>
            <Text style={styles.vitalValue}>
              {latest.bloodPressureSystolic}/{latest.bloodPressureDiastolic}
            </Text>
          </View>
        )}
        {latest.heartRate && (
          <View style={styles.vitalItem}>
            <Text style={styles.vitalLabel}>HR</Text>
            <Text style={styles.vitalValue}>{latest.heartRate}</Text>
          </View>
        )}
        {latest.temperature && (
          <View style={styles.vitalItem}>
            <Text style={styles.vitalLabel}>Temp</Text>
            <Text style={styles.vitalValue}>{latest.temperature}°F</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Patient Header */}
      {chartData.patient && (
        <View style={styles.patientHeader}>
          <Text style={styles.patientName}>
            {chartData.patient.firstName} {chartData.patient.lastName}
          </Text>
          <View style={styles.patientInfo}>
            <Text style={styles.infoText}>MRN: {chartData.patient.mrn}</Text>
            <Text style={styles.infoText}>DOB: {chartData.patient.dateOfBirth}</Text>
            <Text style={styles.infoText}>Sex: {chartData.patient.sex}</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('VoiceRecording', { patientId })}
        >
          <Text style={styles.actionButtonText}>🎙️ Start Encounter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('OrderEntry', { patientId })}
        >
          <Text style={styles.actionButtonText}>📋 New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Sections */}
      <View style={styles.chartSections}>
        {renderSectionHeader('Allergies')}
        <View style={styles.sectionContent}>{renderAllergies()}</View>

        {renderSectionHeader('Medical Problems')}
        <View style={styles.sectionContent}>{renderMedicalProblems()}</View>

        {renderSectionHeader('Medications')}
        <View style={styles.sectionContent}>{renderMedications()}</View>

        {renderSectionHeader('Vital Signs')}
        <View style={styles.sectionContent}>{renderVitalSigns()}</View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  patientInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chartSections: {
    paddingBottom: 24,
  },
  sectionHeader: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  sectionContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  statusactive: {
    backgroundColor: '#DEF7EC',
    color: '#03543F',
  },
  statusresolved: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  severitymild: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  severitymoderate: {
    backgroundColor: '#FED7AA',
    color: '#C2410C',
  },
  severitysevere: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
});