import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={styles.logoNavy}>CLAR</Text>
          <Text style={styles.logoGold}>AFI</Text>
        </Text>
        <Text style={styles.subtitle}>EMR Mobile</Text>
      </View>
      
      <Text style={styles.welcome}>Welcome to Clarafi Mobile!</Text>
      <Text style={styles.description}>
        Your EMR system on the go
      </Text>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  logoNavy: {
    color: '#003366',
  },
  logoGold: {
    color: '#FFD700',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#003366',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
