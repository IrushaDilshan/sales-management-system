import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RepSettings() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (userEmail) {
                setEmail(userEmail);

                const { data: userRecord } = await supabase
                    .from('users')
                    .select('name')
                    .eq('email', userEmail)
                    .single();

                if (userRecord?.name) {
                    setName(userRecord.name);
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            const { error } = await supabase
                .from('users')
                .update({ name: name.trim() })
                .eq('email', userEmail);

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please enter both password fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            Alert.alert('Success', 'Password changed successfully');
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/login' as any);
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Premium Gradient Header */}
            <LinearGradient
                colors={['#7C3AED', '#A78BFA', '#EC4899', '#F472B6']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circles */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />

                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>ACCOUNT</Text>
                        <Text style={styles.title}>Settings</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                            style={styles.avatar}
                        >
                            <Ionicons name="person" size={28} color="#FFF" />
                        </LinearGradient>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="person-outline" size={18} color="#7C3AED" />
                        </View>
                        <Text style={styles.sectionTitle}>Profile Information</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor="#9CA3AF"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={[styles.inputContainer, styles.inputDisabled]}>
                            <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: '#9CA3AF' }]}
                                value={email}
                                editable={false}
                            />
                        </View>
                        <Text style={styles.helpText}>
                            <Ionicons name="information-circle" size={12} color="#6B7280" /> Email cannot be changed
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={handleUpdateProfile}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#7C3AED', '#EC4899']}
                            style={styles.gradientBtn}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="white" />
                                    <Text style={styles.btnText}>Update Profile</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Password Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconWrapper, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.sectionTitle}>Security</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter new password"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm new password"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#F59E0B', '#F97316']}
                            style={styles.gradientBtn}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="key-outline" size={20} color="white" />
                                    <Text style={styles.btnText}>Update Password</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Logout Section */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                        <Text style={styles.logoutBtnText}>Sign Out</Text>
                        <Ionicons name="chevron-forward" size={20} color="#DC2626" />
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Ionicons name="shield-checkmark" size={24} color="#9CA3AF" />
                    <Text style={styles.appInfoText}>Sales Management System</Text>
                    <Text style={styles.versionText}>Representative Portal v1.0.0</Text>
                </View>

                {/* Bottom Padding for Nav Bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    header: {
        paddingTop: 60,
        paddingBottom: 36,
        paddingHorizontal: 24,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
        overflow: 'hidden'
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -50,
        right: -50
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        bottom: -30,
        left: -40
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1
    },
    greeting: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 4,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase'
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8
    },
    avatarContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: 20,
        gap: 16
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
        gap: 12
    },
    iconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#EDE9FE',
        justifyContent: 'center',
        alignItems: 'center'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.3
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        letterSpacing: 0.2,
        textTransform: 'uppercase'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        height: 48
    },
    inputIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500'
    },
    inputDisabled: {
        backgroundColor: '#F0F0F0',
        borderColor: '#E0E0E0'
    },
    helpText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 6,
        fontWeight: '500'
    },
    primaryBtn: {
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        gap: 8
    },
    btnDisabled: {
        opacity: 0.6
    },
    btnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FEE2E2',
        backgroundColor: '#FAFAFA'
    },
    logoutBtnText: {
        flex: 1,
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 12,
        letterSpacing: 0.2
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 20,
        gap: 8
    },
    appInfoText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '600',
        marginTop: 4
    },
    versionText: {
        fontSize: 11,
        color: '#CBD5E1',
        fontWeight: '600'
    }
});
