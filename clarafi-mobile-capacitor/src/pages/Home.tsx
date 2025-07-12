import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonGrid, IonRow, IonCol, IonIcon } from '@ionic/react';
import { peopleOutline, clipboardOutline, micOutline, statsChartOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div className="home-container">
          <IonGrid>
            <IonRow>
              <IonCol size="12" sizeMd="6">
                <IonCard className="dashboard-card" onClick={() => history.push('/patients')}>
                  <IonCardHeader>
                    <IonIcon icon={peopleOutline} className="card-icon" />
                    <IonCardTitle>Patients</IonCardTitle>
                    <IonCardSubtitle>View and manage patients</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              </IonCol>
              
              <IonCol size="12" sizeMd="6">
                <IonCard className="dashboard-card" onClick={() => history.push('/voice')}>
                  <IonCardHeader>
                    <IonIcon icon={micOutline} className="card-icon" />
                    <IonCardTitle>Voice Recording</IonCardTitle>
                    <IonCardSubtitle>Record clinical notes</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              </IonCol>
              
              <IonCol size="12" sizeMd="6">
                <IonCard className="dashboard-card" onClick={() => history.push('/orders')}>
                  <IonCardHeader>
                    <IonIcon icon={clipboardOutline} className="card-icon" />
                    <IonCardTitle>Orders</IonCardTitle>
                    <IonCardSubtitle>Manage clinical orders</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              </IonCol>
              
              <IonCol size="12" sizeMd="6">
                <IonCard className="dashboard-card">
                  <IonCardHeader>
                    <IonIcon icon={statsChartOutline} className="card-icon" />
                    <IonCardTitle>Reports</IonCardTitle>
                    <IonCardSubtitle>View analytics</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;