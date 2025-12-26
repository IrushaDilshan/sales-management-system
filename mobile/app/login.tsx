import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            // DEMO MODE: For testing without real users or network
            // Remove this in production!
            if (email.endsWith('@test.com') && password === 'demo') {
                console.log('DEMO MODE: Bypassing ALL auth and network calls');

                // Parse role from email: salesman@test.com → salesman
                const role = email.split('@')[0];

                // Brief delay to simulate loading
                await new Promise(resolve => setTimeout(resolve, 500));

                console.log(`DEMO MODE: Routing to ${role} dashboard`);

                switch (role.toLowerCase()) {
                    case 'salesman':
                    case 'shop_owner':
                        router.replace('/(tabs)/home' as any);
                        break;
                    case 'rep':
                        router.replace('/rep');
                        break;
                    case 'storekeeper':
                    case 'keeper':
                        router.replace('/storekeeper');
                        break;
                    case 'admin':
                        router.replace('/dashboard' as any);
                        break;
                    default:
                        Alert.alert('Demo Mode', `Unknown role: ${role}. Try: salesman@test.com, rep@test.com, or keeper@test.com`);
                }
                setLoading(false);
                return;
            }

            // REAL AUTH: Normal Supabase login (requires network)
            console.log('Attempting real auth with Supabase...');

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) throw error;

            if (data.user) {
                // Get user role from database
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role, name')
                    .eq('email', data.user.email)
                    .single();

                if (userError) {
                    console.error('Error fetching user data:', userError);
                    Alert.alert('Error', 'Could not fetch user information. Please try demo mode: salesman@test.com / demo');
                    return;
                }

                console.log('User logged in:', userData);

                // Route based on role
                if (userData?.role) {
                    switch (userData.role.toLowerCase()) {
                        case 'salesman':
                        case 'shop_owner':
                            router.replace('/(tabs)/home' as any);
                            break;
                        case 'rep':
                        case 'representative':
                            router.replace('/rep/(tabs)/home' as any);
                            break;
                        case 'storekeeper':
                            router.replace('/storekeeper/(tabs)/home' as any);
                            break;
                        case 'admin':
                            router.replace('/dashboard' as any);
                            break;
                        default:
                            Alert.alert('Error', `Unknown role: ${userData.role}`);
                    }
                } else {
                    Alert.alert('Error', 'User role not found');
                }
            }
        } catch (error: any) {
            // Silently ignore abort errors (user navigated away quickly)
            if (error.name === 'AbortError' || error.message?.includes('Aborted') || error.message?.includes('AuthRetryableFetchError')) {
                console.log('Login aborted or network issue - likely user navigated away');
                setLoading(false);
                return;
            }

            // Log login issues (not as error to avoid console spam)
            console.log('Login failed:', error.message || error);

            // Better error messages for network issues
            let errorMessage = 'Login failed. ';

            if (error.message?.includes('Network request failed') || error.name === 'TypeError') {
                errorMessage = '❌ Network Error\n\nCannot connect to server. Please check your internet connection.\n\n✅ Try Demo Mode:\n• Email: rep@test.com\n• Password: demo';
            } else if (error.message?.includes('Invalid login credentials')) {
                errorMessage = '❌ Invalid Credentials\n\nEmail or password is incorrect.\n\n✅ Try Demo Mode:\n• Email: rep@test.com\n• Password: demo';
            } else {
                errorMessage = error.message || '❌ Login Failed\n\nPlease try demo mode:\n• Email: rep@test.com\n• Password: demo';
            }

            Alert.alert('Login Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.content}>
                {/* Logo/Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="receipt" size={60} color="#2196F3" />
                    </View>
                    <Text style={styles.title}>Sales Management</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                {/* Login Form */}
                <View style={styles.form}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            editable={!loading}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            editable={!loading}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showPassword ? "eye-outline" : "eye-off-outline"}
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.loginButtonText}>Sign In</Text>
                                <Ionicons name="arrow-forward" size={20} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        🌐 No Internet? Use Demo Mode
                    </Text>
                    <Text style={[styles.footerText, { fontWeight: '700', color: '#2196F3', marginTop: 8 }]}>
                        salesman@test.com / demo
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24
    },
    header: {
        alignItems: 'center',
        marginBottom: 40
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a2e',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280'
    },
    form: {
        gap: 16
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        height: 56
    },
    inputIcon: {
        marginRight: 12
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a2e'
    },
    eyeIcon: {
        padding: 4
    },
    loginButton: {
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
        gap: 8,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    loginButtonDisabled: {
        opacity: 0.6
    },
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700'
    },
    footer: {
        marginTop: 40,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center'
    }
});
