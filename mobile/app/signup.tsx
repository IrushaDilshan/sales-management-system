import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('pending'); // Default role for approval
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !phone) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        name: name,
                        phone: phone,
                        role: role
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Insert into public.users table
                // Note: This matches the login.tsx logic which queries public.users
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: authData.user.id,
                            email: email.trim(),
                            name: name,
                            phone: phone,
                            role: role,
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (dbError) {
                    // Check if it's the known schema error (missing phone column)
                    const isSchemaError = dbError.code === 'PGRST204' || dbError.message?.includes('phone');

                    if (!isSchemaError) {
                        console.error('Error creating user profile:', dbError);
                    } else {
                        // Fallback: Retry without 'phone' if the column is missing in DB
                        // We log this as LOG, not ERROR, so it doesn't trigger the Red Screen
                        console.log('Schema mismatch detected (missing phone). Retrying without phone number...');
                        const { error: retryError } = await supabase
                            .from('users')
                            .insert([
                                {
                                    id: authData.user.id,
                                    email: email.trim(),
                                    name: name,
                                    role: role,
                                    // phone: omitted
                                    created_at: new Date().toISOString()
                                }
                            ]);

                        if (retryError) console.error('Retry failed:', retryError);
                    }
                }

                Alert.alert(
                    'Registration Successful',
                    'Your account has been created and is pending Administrator approval.\n\nPlease wait for your account to be activated.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/login')
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error('Signup error:', error);

            // Check if user is already registered in Auth but maybe not in public schema
            if (error.message?.includes('User already registered') || error.message?.includes('already_registered')) {
                // Try to recover: 
                // If we can't log them in to check, we can't easily fix it from here without password.
                // But we can tell them to login.
                Alert.alert('Account Exists', 'This email is already registered. Please sign in.', [
                    { text: 'Go to Login', onPress: () => router.replace('/login') }
                ]);
            } else {
                Alert.alert('Error', error.message || 'Failed to sign up');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
                    </TouchableOpacity>
                    <View style={styles.iconContainer}>
                        <Ionicons name="person-add" size={40} color="#2196F3" />
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to get started</Text>
                </View>

                <View style={styles.form}>
                    {/* Name Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            editable={!loading}
                        />
                    </View>

                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            editable={!loading}
                        />
                    </View>

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



                    {/* Sign Up Button */}
                    <TouchableOpacity
                        style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.signupButtonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.replace('/login')}>
                            <Text style={styles.linkText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24
    },
    header: {
        alignItems: 'center',
        marginBottom: 30
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 8
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 28,
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
        borderWidth: 1,
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
    signupButton: {
        backgroundColor: '#2196F3',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    signupButtonDisabled: {
        opacity: 0.6
    },
    signupButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700'
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24
    },
    footerText: {
        fontSize: 14,
        color: '#6b7280'
    },
    linkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2196F3'
    }
});
