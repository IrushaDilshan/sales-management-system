import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function SalesmanSettings() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('Auth error:', authError);
                return;
            }

            setEmail(user.email || '');

            const { data: userData, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (userData) {
                setUserData(userData);
                setName(userData.name || '');
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
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                Alert.alert('Error', 'Not authenticated');
                return;
            }

            const { error } = await supabase
                .from('users')
                .update({ name: name.trim() })
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully');
            fetchUserData();
        } catch (error: any) {
            console.error('Update error:', error);
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Alert.alert('Success', 'Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Password change error:', error);
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
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
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
            {/* Gradient Header */}
            <LinearGradient
                colors={['#2196F3', '#1976D2', '#0D47A1']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>Account</Text>
                        <Text style={styles.title}>Settings</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                            style={styles.avatar}
                        >
                            <Ionicons name="person" size={32} color="#FFF" />
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
                            <Ionicons name="person-outline" size={20} color="#2196F3" />
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
                            colors={['#2196F3', '#1976D2']}
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
                            <Ionicons name="lock-closed-outline" size={20} color="#FF9800" />
                        </View>
                        <Text style={styles.sectionTitle}>Security</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
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
                            colors={['#FF9800', '#F57C00']}
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
                        <Ionicons name="log-out-outline" size={22} color="#F44336" />
                        <Text style={styles.logoutBtnText}>Sign Out</Text>
                        <Ionicons name="chevron-forward" size={20} color="#F44336" />
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Ionicons name="shield-checkmark" size={24} color="#9CA3AF" />
                    <Text style={styles.appInfoText}>Sales Management System</Text>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
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
        backgroundColor: '#F5F7FA'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5
    },
    avatarContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
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
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A2E',
        letterSpacing: -0.3
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 8,
        letterSpacing: 0.2,
        textTransform: 'uppercase'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        height: 52
    },
    inputIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1A1A2E',
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
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
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
        padding: 18,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#FFEBEE',
        backgroundColor: '#FAFAFA'
    },
    logoutBtnText: {
        flex: 1,
        color: '#F44336',
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
