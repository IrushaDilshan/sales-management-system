import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
    ImageBackground,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function SalesmanSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) return;

            setEmail(user.email || '');

            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (userData) {
                setName(userData.name || '');
                setRole(userData.role || 'Salesman');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty');

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('users')
                .update({ name: name.trim() })
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) return Alert.alert('Error', 'Please fill in all password fields');
        if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
        if (newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Alert.alert('Success', 'Password changed successfully');
            setNewPassword('');
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

    const BrandGradient = ({ style, children }: { style?: any, children?: any }) => (
        <LinearGradient
            colors={['#0EA5E9', '#2563EB', '#1e1b4b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={style}
        >
            {children}
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

            <BrandGradient style={styles.headerContainer}>
                <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
                    {/* Header Top Row */}
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Settings</Text>

                        {/* Spacer to balance header title */}
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarContainer}>
                                <Text style={styles.avatarText}>
                                    {name ? name.charAt(0).toUpperCase() : 'U'}
                                </Text>
                            </View>
                            <View style={styles.editAvatarBadge}>
                                <Ionicons name="camera" size={12} color="#FFF" />
                            </View>
                        </View>

                        <Text style={styles.userName}>{name || 'Loading...'}</Text>
                        <Text style={styles.userEmail}>{email}</Text>

                        <View style={styles.rolePill}>
                            <Text style={styles.roleText}>{role || 'SALESMAN'}</Text>
                        </View>
                    </View>
                </View>
            </BrandGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Account Settings */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.formCard}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your Name"
                            placeholderTextColor="#CBD5E1"
                        />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.readOnlyRow}>
                            <Text style={styles.readOnlyText}>{email}</Text>
                            <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleUpdateProfile}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={{ marginBottom: 24 }}
                >
                    <BrandGradient style={styles.mainButton}>
                        <Text style={styles.mainButtonText}>Save Changes</Text>
                    </BrandGradient>
                </TouchableOpacity>

                {/* Security Settings */}
                <Text style={styles.sectionTitle}>Security</Text>
                <View style={styles.formCard}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Min 6 characters"
                            placeholderTextColor="#CBD5E1"
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Re-enter password"
                            placeholderTextColor="#CBD5E1"
                            secureTextEntry
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleChangePassword}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={{ marginBottom: 32 }}
                >
                    <BrandGradient style={styles.mainButton}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Update Password</Text>}
                    </BrandGradient>
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Sign Out from Device</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>v2.4.0 (2026)</Text>

                {/* Bottom Padding for Tabs */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        paddingHorizontal: 20
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    headerActionPlaceholder: {
        width: 40
    },
    profileSection: {
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12
    },
    avatarContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 2,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFF'
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2563EB',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0F172A'
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 4
    },
    userEmail: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 12
    },
    rolePill: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    roleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 1
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    statLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 2
    },
    statValue: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '700'
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
        marginLeft: 4
    },
    formCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 6,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    inputContainer: {
        padding: 16
    },
    label: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase'
    },
    input: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '600',
        padding: 0
    },
    readOnlyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    readOnlyText: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '600'
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 16
    },
    mainButton: {
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF'
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 18,
        backgroundColor: '#FFF1F2',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FECDD3'
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#E11D48'
    },
    versionText: {
        textAlign: 'center',
        marginTop: 24,
        color: '#CBD5E1',
        fontSize: 12,
        fontWeight: '500'
    }
});
