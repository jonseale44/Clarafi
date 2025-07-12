import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
} from '@ionic/react';

import { useLocation } from 'react-router-dom';
import { 
  homeOutline, 
  homeSharp, 
  peopleOutline, 
  peopleSharp,
  clipboardOutline,
  clipboardSharp,
  personOutline,
  personSharp,
  logOutOutline,
  logOutSharp 
} from 'ionicons/icons';
import './Menu.css';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: 'Home',
    url: '/home',
    iosIcon: homeOutline,
    mdIcon: homeSharp
  },
  {
    title: 'Patients',
    url: '/patients',
    iosIcon: peopleOutline,
    mdIcon: peopleSharp
  },
  {
    title: 'Orders',
    url: '/orders',
    iosIcon: clipboardOutline,
    mdIcon: clipboardSharp
  },
  {
    title: 'Profile',
    url: '/profile',
    iosIcon: personOutline,
    mdIcon: personSharp
  }
];

const Menu: React.FC = () => {
  const location = useLocation();

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>
            <span style={{ color: 'var(--clarafi-navy)' }}>CLAR</span>
            <span style={{ color: 'var(--clarafi-gold)' }}>AFI</span>
          </IonListHeader>
          <IonNote>Electronic Medical Records</IonNote>
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                  <IonIcon aria-hidden="true" slot="start" ios={appPage.iosIcon} md={appPage.mdIcon} />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
          <IonMenuToggle autoHide={false}>
            <IonItem routerLink="/login" routerDirection="none" lines="none" detail={false}>
              <IonIcon aria-hidden="true" slot="start" ios={logOutOutline} md={logOutSharp} />
              <IonLabel>Logout</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;