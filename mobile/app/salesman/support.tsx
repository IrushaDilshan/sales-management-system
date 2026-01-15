import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function SupportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleCall = () => {
        Linking.openURL('tel:+94112345678');
    };

    const handleEmail = () => {
        Linking.openURL('mailto:support@nldb.lk');
    };

    const handleWeb = () => {
        Linking.openURL('https://nldb.gov.lk');
    };

    const handleSendMessage = () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert('Incomplete', 'Please fill in both subject and message.');
            return;
        }

        setSending(true);
        // Simulate API call
        setTimeout(() => {
            setSending(false);
            Alert.alert('Message Sent', 'Thank you for contacting us. We will get back to you shortly.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            setSubject('');
            setMessage('');
        }, 1500);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header with Gradient */}
            <LinearGradient
                colors={['#EA580C', '#C2410C']}
                style={[styles.header, { paddingTop: insets.top }]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Hero Section inside Header */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>How can we help you?</Text>
                    <Text style={styles.heroSubtitle}>Our team is available 24/7 to assist you.</Text>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Contact Options Cards */}
                <View style={styles.contactRow}>
                    <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
                            <Ionicons name="call" size={24} color="#EA580C" />
                        </View>
                        <Text style={styles.contactLabel}>Call Us</Text>
                        <Text style={styles.contactValue}>+94 11 234 5678</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
                        <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="mail" size={24} color="#0284C7" />
                        </View>
                        <Text style={styles.contactLabel}>Email Us</Text>
                        <Text style={styles.contactValue}>support@nldb.lk</Text>
                    </TouchableOpacity>
                </View>

                {/* Message Form */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Send us a Message</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Subject</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Stock Issue"
                            value={subject}
                            onChangeText={setSubject}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your issue..."
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, sending && styles.submitBtnDisabled]}
                        onPress={handleSendMessage}
                        disabled={sending}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Send Message</Text>
                                <Ionicons name="send" size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* FAQ / Website Link */}
                <TouchableOpacity style={styles.linkCard} onPress={handleWeb}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="globe-outline" size={24} color="#475569" />
                        <View>
                            <Text style={styles.linkTitle}>Visit our Website</Text>
                            <Text style={styles.linkSubtitle}>www.nldb.gov.lk</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>App Version 1.0.0</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 10
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    heroSection: {
        paddingHorizontal: 24,
        paddingBottom: 24, // Increased padding for better spacing
        alignItems: 'center'
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center'
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
        textAlign: 'center'
    },
    scrollContent: {
        padding: 20,
    },
    contactRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
        marginTop: 4
    },
    contactCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12
    },
    contactLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 2
    },
    contactValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center'
    },
    formSection: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 20
    },
    inputGroup: {
        marginBottom: 16
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
        marginLeft: 4
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    textArea: {
        minHeight: 120,
    },
    submitBtn: {
        backgroundColor: '#EA580C',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    submitBtnDisabled: {
        opacity: 0.7
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    },
    linkCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    linkTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A'
    },
    linkSubtitle: {
        fontSize: 13,
        color: '#64748B'
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 20
    },
    versionText: {
        fontSize: 12,
        color: '#94A3B8'
    }
});
