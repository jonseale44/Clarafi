import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonSearchbar, IonRefresher, IonRefresherContent, IonSpinner, IonFab, IonFabButton, IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import React, { useState, useEffect } from 'react';
import { RefresherEventDetail } from '@ionic/react';
import { apiService } from '../services/api.service';
import './PatientList.css';

interface Patient {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  phone?: string;
}

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchText, patients]);

  const loadPatients = async () => {
    try {
      const data = await apiService.getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadPatients();
    event.detail.complete();
  };

  const filterPatients = () => {
    if (!searchText.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const query = searchText.toLowerCase();
    const filtered = patients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        patient.mrn.toLowerCase().includes(query) ||
        patient.phone?.includes(query)
      );
    });
    setFilteredPatients(filtered);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Patients</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search patients..."
          ></IonSearchbar>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>
        
        {loading ? (
          <div className="loading-container">
            <IonSpinner />
          </div>
        ) : (
          <IonList>
            {filteredPatients.map((patient) => (
              <IonItem key={patient.id} routerLink={`/patient/${patient.id}`} detail>
                <IonLabel>
                  <h2>{patient.lastName}, {patient.firstName}</h2>
                  <p>MRN: {patient.mrn} | DOB: {patient.dateOfBirth}</p>
                  <p>Sex: {patient.sex} {patient.phone && `| Phone: ${patient.phone}`}</p>
                </IonLabel>
              </IonItem>
            ))}
            {filteredPatients.length === 0 && (
              <IonItem>
                <IonLabel>
                  <p className="no-patients">No patients found</p>
                </IonLabel>
              </IonItem>
            )}
          </IonList>
        )}
        
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default PatientList;