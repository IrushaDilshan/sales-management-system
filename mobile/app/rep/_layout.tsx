import { Stack } from 'expo-router';

export default function RepLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="request" />
        </Stack>
    );
}
