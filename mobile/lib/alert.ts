import { Alert, Platform } from 'react-native';

export function showSuccessAlert(title: string, message: string, onOk?: () => void) {
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert(`${title}\n\n${message}`);
        }
        onOk?.();
    } else {
        Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
}

export function showErrorAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert(`${title}: ${message}`);
        }
    } else {
        Alert.alert(title, message);
    }
}
