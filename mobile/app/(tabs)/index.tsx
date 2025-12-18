import { Image, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Sales Dashboard</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Salesman Actions</ThemedText>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/shops')}
        >
          <Text style={styles.buttonText}>New Sales Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={() => router.push('/shop-owner/submit-income')}
        >
          <Text style={styles.buttonText}>Submit Daily Income</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#9C27B0' }]}
          onPress={() => router.push('/salesman/income-history')}
        >
          <Text style={styles.buttonText}>View Income History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/salesman/request-history')}
        >
          <Text style={styles.buttonText}>View Request History</Text>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Representative Actions</ThemedText>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#2196F3' }]}
          onPress={() => router.push('/rep')}
        >
          <Text style={styles.buttonText}>Pending Requests (Rep)</Text>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Storekeeper Actions</ThemedText>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/storekeeper')}
        >
          <Text style={styles.buttonText}>Storekeeper Dashboard</Text>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
