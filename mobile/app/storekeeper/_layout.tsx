import { Stack } from 'expo-router';

export default function StorekeeperLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ title: 'Storekeeper Dashboard', headerBackTitle: 'Home' }} />
            <Stack.Screen name="inventory" options={{ title: 'Inventory Management', headerBackTitle: 'Dashboard' }} />
            <Stack.Screen name="action" options={{ presentation: 'modal', title: 'Transaction' }} />
            <Stack.Screen name="history" options={{ presentation: 'modal', title: 'Item History' }} />
        </Stack>
    );
}
