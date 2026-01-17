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
import { supabase } from '../lib/supabase';

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
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Manage your account</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Profile Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person-outline" size={24} color="#2196F3" />
                        <Text style={styles.sectionTitle}>Profile Information</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.inputDisabled]}
                            value={email}
                            editable={false}
                        />
                        <Text style={styles.helpText}>Email cannot be changed</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.updateBtn, loading && styles.updateBtnDisabled]}
                        onPress={handleUpdateProfile}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={20} color="white" />
                                <Text style={styles.updateBtnText}>Update Profile</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Password Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="lock-closed-outline" size={24} color="#2196F3" />
                        <Text style={styles.sectionTitle}>Change Password</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                            secureTextEntry
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            secureTextEntry
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.updateBtn, loading && styles.updateBtnDisabled]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="key-outline" size={20} color="white" />
                                <Text style={styles.updateBtnText}>Change Password</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Logout Section */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={24} color="#f44336" />
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appInfoText}>NLDBSales</Text>
                    <Text style={styles.appInfoText}>Version 1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff'
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4
    },
    backBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: 20,
        gap: 20,
        paddingBottom: 20
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e'
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        color: '#1a1a2e'
    },
    inputDisabled: {
        backgroundColor: '#e9ecef',
        color: '#6b7280'
    },
    helpText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4
    },
    updateBtn: {
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 8,
        gap: 8
    },
    updateBtnDisabled: {
        opacity: 0.6
    },
    updateBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700'
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#f44336'
    },
    logoutBtnText: {
        color: '#f44336',
        fontSize: 16,
        fontWeight: '700'
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20
    },
    appInfoText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4
    }
});
