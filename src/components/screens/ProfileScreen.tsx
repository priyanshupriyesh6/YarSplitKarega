// ─────────────────────────────────────────────
//  Profile Screen — Account + Settings
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency, getInitials } from '../../utils/formatters';
import { Card, Avatar, Badge, Divider } from '../ui';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfile } = useAuthStore();
  const { groups, expenses, getTotalOwed, getTotalIOwe } = useExpenseStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');

  const totalOwed = getTotalOwed();
  const totalIOwe = getTotalIOwe();
  const totalExpenses = expenses.length;
  const totalGroups = groups.length;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      if (expenses.length === 0) {
        Alert.alert('Export Data', 'You have no expense records to export.');
        return;
      }

      // Generate CSV content
      let csvContent = 'Type,Title,Amount,Currency,Category,Date,PaidBy,Group\n';
      expenses.forEach((e) => {
        const groupName = groups.find((g) => g.id === e.groupId)?.name || 'Unknown Group';
        const row = `Expense,"${e.title.replace(/"/g, '""')}",${e.amount},${e.currency},${e.category},${e.date},"${e.paidByName.replace(/"/g, '""')}","${groupName.replace(/"/g, '""')}"\n`;
        csvContent += row;
      });

      const fileUri = documentDirectory + 'yarsplitkarega_export.csv';
      await writeAsStringAsync(fileUri, csvContent, {
        encoding: EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export split smart data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export Complete', 'CSV file saved locally under document directory, but sharing is unavailable.');
      }
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Export Failed', 'Failed to generate and share CSV file.');
    }
  };

  const handleShareApp = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        const fileUri = documentDirectory + 'share.txt';
        await writeAsStringAsync(fileUri, 'Hey! Join SplitSmart (YarSplitKarega) to track and split expenses with me seamlessly: https://yarsplitkarega.app/download');
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Share YarSplitKarega' });
      } else {
        Alert.alert('Share SplitSmart', 'Tell your friends to check out SplitSmart (YarSplitKarega)!');
      }
    } catch (e) {
      Alert.alert('Share SplitSmart', 'Tell your friends to check out SplitSmart (YarSplitKarega)!');
    }
  };

  const MENU_SECTIONS = [
    {
      title: 'Account',
      items: [
        { 
          icon: 'person-outline', 
          label: 'Edit Profile', 
          iconColor: Colors.primary, 
          onPress: () => { 
            setEditDisplayName(user?.displayName || ''); 
            setIsEditModalVisible(true); 
          } 
        },
        { 
          icon: 'shield-checkmark-outline', 
          label: 'Security', 
          iconColor: Colors.accent, 
          onPress: () => Alert.alert('Security', 'Your SplitSmart account is encrypted and secured by Supabase high-grade JWT tokens.') 
        },
        { 
          icon: 'link-outline', 
          label: 'Connected Accounts', 
          iconColor: Colors.secondary, 
          badge: 'Google', 
          onPress: () => Alert.alert('Connected Accounts', 'Your profile is securely linked and authenticated via Google OAuth.') 
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          iconColor: Colors.warning,
          toggle: true,
          value: notificationsEnabled,
          onToggle: (val: boolean) => {
            setNotificationsEnabled(val);
            Alert.alert('Notifications', `Push notifications have been ${val ? 'enabled' : 'disabled'}.`);
          },
        },
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          iconColor: Colors.primaryLight,
          toggle: true,
          value: darkMode,
          onToggle: (val: boolean) => {
            setDarkMode(val);
            Alert.alert('Theme Preferences', `Dark Mode has been ${val ? 'enabled' : 'disabled'}. SplitSmart matches your premium device dark theme.`);
          },
        },
        {
          icon: 'mail-outline',
          label: 'Weekly Digest',
          iconColor: Colors.accent,
          toggle: true,
          value: weeklyDigest,
          onToggle: (val: boolean) => {
            setWeeklyDigest(val);
            Alert.alert('Weekly Digest', `Weekly digest updates have been ${val ? 'enabled' : 'disabled'}. You will receive a summary of your active splits via email.`);
          },
        },
      ],
    },
    {
      title: 'Data',
      items: [
        { 
          icon: 'cloud-download-outline', 
          label: 'Export Data', 
          iconColor: Colors.positive, 
          onPress: handleExportData 
        },
      ],
    },
    {
      title: 'About',
      items: [
        { 
          icon: 'information-circle-outline', 
          label: 'About yarsplitkarega', 
          iconColor: Colors.textSecondary, 
          onPress: () => Alert.alert('About YarSplitKarega', 'YarSplitKarega (SplitSmart) is a premium personal expense manager and group bill-splitting mobile application. Built using Expo, React Native, Supabase, and OCR.space.') 
        },
        { 
          icon: 'star-outline', 
          label: 'Rate the App', 
          iconColor: Colors.warning, 
          onPress: () => Alert.alert('Rate the App', 'Thank you for your support! App store rating features are currently simulated.') 
        },
        { 
          icon: 'share-outline', 
          label: 'Share with Friends', 
          iconColor: Colors.primary, 
          onPress: handleShareApp 
        },
        { 
          icon: 'document-text-outline', 
          label: 'Privacy Policy', 
          iconColor: Colors.textMuted, 
          onPress: () => Alert.alert('Privacy Policy', 'Your daily financial data is encrypted and saved securely inside Supabase cloud database instance. We do not sell or track your personal financial details.') 
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero */}
        <LinearGradient
          colors={['#1A1542', '#0F0E17']}
          style={[styles.heroSection, { paddingTop: insets.top + 20 }]}
        >
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(user?.displayName ?? 'U')}
              </Text>
            </LinearGradient>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.displayName ?? 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>

          <View style={styles.memberSince}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.memberSinceText}>Member since May 2025</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalGroups}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalExpenses}</Text>
              <Text style={styles.statLabel}>Expenses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.positive }]}>
                {formatCurrency(totalOwed, 'INR')}
              </Text>
              <Text style={styles.statLabel}>Owed to you</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.negative }]}>
                {formatCurrency(totalIOwe, 'INR')}
              </Text>
              <Text style={styles.statLabel}>You owe</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu sections */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <Card style={styles.menuCard}>
              {section.items.map((item, i) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    onPress={(item as any).onPress}
                    activeOpacity={0.7}
                    style={styles.menuItem}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: `${(item as any).iconColor}22` }]}>
                      <Ionicons
                        name={(item as any).icon}
                        size={18}
                        color={(item as any).iconColor}
                      />
                    </View>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    {(item as any).badge && (
                      <Badge label={(item as any).badge} color={Colors.primary} size="sm" />
                    )}
                    {(item as any).toggle ? (
                      <Switch
                        value={(item as any).value}
                        onValueChange={(item as any).onToggle}
                        trackColor={{ false: Colors.backgroundElevated, true: Colors.primary }}
                        thumbColor={Colors.text}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                  {i < section.items.length - 1 && (
                    <View style={styles.menuDivider} />
                  )}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutButton}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>yarsplitkarega v1.0.0 · Made with ❤️ in India</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent} elevated>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>Display Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveBtn} 
                onPress={async () => {
                  if (editDisplayName.trim().length === 0) {
                    Alert.alert('Error', 'Name cannot be empty');
                    return;
                  }
                  try {
                    await updateProfile({ displayName: editDisplayName.trim() });
                    setIsEditModalVisible(false);
                    Alert.alert('Success', 'Profile updated successfully!');
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to update profile');
                  }
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { gap: Spacing.base },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  avatarInitials: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  userName: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  memberSinceText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginTop: Spacing.base,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
  },
  menuSection: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  menuSectionTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 4,
  },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginLeft: 52 + Spacing.base,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.errorAlpha,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    fontFamily: Typography.fontFamily.semiBold,
  },
  version: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    paddingBottom: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  modalLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  modalCancelText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  modalSaveText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
});
