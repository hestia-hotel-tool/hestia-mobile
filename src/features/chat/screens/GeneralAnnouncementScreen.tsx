import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import type { User } from '@/types';
import { ExcludeStaffModal, summariseExclusion } from '../components/ExcludeStaffModal';
import { loadAllColleagues } from '../utils/colleagues';
import { ANNOUNCEMENT_LIMITS, publishAnnouncement } from '../services/chat';
import { CHAT_COLORS, scaleX } from '../constants/chatStyles';

/** Design px on the 440-wide frame — Figma 4241:405. */
const A = {
  /** Band y0–98; chevron and title at y38, so 32 below the title row. */
  bandBottom: 32,
  side: 21,
  /** "Subject" y120 — 22 below the band. */
  firstLabelTop: 22,
  labelFontSize: 16,
  /** Label → box 11; box → next label 21 (23 before "Exclude Staff"). */
  labelGap: 11,
  sectionGap: 21,
  fieldHeight: 68,
  fieldRadius: 8,
  fieldBorder: '#afa9ad',
  /** Values sit 15 in ("Welcome Message") and 20 in ("None"). */
  fieldPadding: 15,
  noneInset: 20,
  valueFontSize: 15,
  messageHeight: 375,
  /** Publish x21 y788 382x70 — 23 below the last box. */
  publishTop: 23,
  publishHeight: 70,
  publishFontSize: 18,
  /** Cancel's text sits 15 below the Publish bar. */
  cancelTop: 15,
} as const;

/**
 * General Announcement — Figma 4241:405.
 *
 * Subject, message and an optional list of staff to leave out, then Publish:
 * everyone else in the hotel gets it as a `general` notification (the Chat
 * list's "General" row). The server function checks `chat.announce`; this
 * route is gated on it too, and the menu hides the option without it.
 */
export default function GeneralAnnouncementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [excluded, setExcluded] = useState<string[]>([]);
  const [showExclude, setShowExclude] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const messageRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    // Everyone but the sender — they never receive their own announcement.
    loadAllColleagues()
      .then((list) => {
        if (!cancelled) setStaff(list);
      })
      .catch((e) => console.warn('[Announcement] load staff', e))
      .finally(() => {
        if (!cancelled) setStaffLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** "None", "Engineering", "Laundry, Zoe Tsakeri", "Engineering, Laundry and 3 others". */
  const excludedLabel = (() => {
    if (excluded.length === 0) return 'None';
    const { departments, people } = summariseExclusion(staff, excluded);
    const parts = [...departments.map((d) => d.title), ...people.map((u) => u.name)];
    if (parts.length === 0) return `${excluded.length} staff`;
    if (parts.length <= 2) return parts.join(', ');
    return `${parts.slice(0, 2).join(', ')} and ${parts.length - 2} others`;
  })();

  const canPublish = subject.trim().length > 0 && message.trim().length > 0 && !publishing;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(chats)' as never);
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    Keyboard.dismiss();
    setPublishing(true);
    const result = await publishAnnouncement({
      subject: subject.trim(),
      body: message.trim(),
      excludeUserIds: excluded,
    });
    setPublishing(false);
    if ('error' in result) {
      toast.show(result.error, { type: 'error', title: 'Announcement not sent' });
      return;
    }
    toast.show(
      result.recipients === 1 ? 'Sent to 1 member of staff.' : `Sent to ${result.recipients} members of staff.`,
      { type: 'success', title: 'Announcement published' }
    );
    goBack();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + 6 * scaleX }]}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          {/* 14x28; `action-chevron`'s aspect is exactly 0.5. */}
          <Icon name="action-chevron" size={28 * scaleX} color={CHAT_COLORS.glyph} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          General Announcement
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 * scaleX }]}
          keyboardShouldPersistTaps="handled"
          // The message box is multiline, so Return adds a line rather than
          // closing the keyboard — and with the keyboard up, Exclude Staff
          // and Publish sit underneath it. Dragging the form, tapping an empty
          // part of it, or "Done" on the bar above the keyboard all close it.
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <Text style={[styles.label, { marginTop: A.firstLabelTop * scaleX }]}>Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Welcome Message"
              placeholderTextColor="rgba(0,0,0,0.36)"
              maxLength={ANNOUNCEMENT_LIMITS.subject}
              style={[styles.field, styles.subject]}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => messageRef.current?.focus()}
              inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
              accessibilityLabel="Subject"
            />

            <Text style={[styles.label, { marginTop: A.sectionGap * scaleX }]}>Input text</Text>
            <TextInput
              ref={messageRef}
              value={message}
              onChangeText={setMessage}
              placeholder="Write the announcement"
              placeholderTextColor="rgba(0,0,0,0.36)"
              maxLength={ANNOUNCEMENT_LIMITS.body}
              multiline
              textAlignVertical="top"
              style={[styles.field, styles.message]}
              inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
              accessibilityLabel="Announcement text"
            />

            <Text style={[styles.label, { marginTop: (A.sectionGap + 2) * scaleX }]}>Exclude Staff</Text>
            <Pressable
              style={[styles.field, styles.excludeField]}
              onPress={() => {
                Keyboard.dismiss();
                setShowExclude(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Exclude staff: ${excludedLabel}`}
            >
              <Text style={styles.value} numberOfLines={1}>
                {excludedLabel}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.publish, !canPublish ? styles.publishDisabled : null]}
              onPress={handlePublish}
              disabled={!canPublish}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canPublish, busy: publishing }}
            >
              {publishing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.publishText}>Publish</Text>
              )}
            </Pressable>

            <Pressable onPress={goBack} style={styles.cancel} hitSlop={8} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <KeyboardDoneBar />

      <ExcludeStaffModal
        visible={showExclude}
        staff={staff}
        loading={staffLoading}
        selectedIds={excluded}
        onClose={() => setShowExclude(false)}
        onDone={(ids) => {
          setExcluded(ids);
          setShowExclude(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  band: {
    backgroundColor: CHAT_COLORS.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 27 * scaleX,
    paddingRight: 21 * scaleX,
    paddingBottom: A.bandBottom * scaleX,
  },
  title: {
    flexShrink: 1,
    marginLeft: 28 * scaleX,
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.title,
  },
  content: {
    paddingHorizontal: A.side * scaleX,
  },
  label: {
    marginBottom: A.labelGap * scaleX,
    fontSize: A.labelFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#000000',
  },
  field: {
    borderWidth: 1,
    borderColor: A.fieldBorder,
    borderRadius: A.fieldRadius * scaleX,
    paddingHorizontal: A.fieldPadding * scaleX,
  },
  subject: {
    height: A.fieldHeight * scaleX,
    fontSize: A.valueFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  message: {
    height: A.messageHeight * scaleX,
    paddingTop: A.fieldPadding * scaleX,
    paddingBottom: A.fieldPadding * scaleX,
    fontSize: A.valueFontSize * scaleX,
    lineHeight: 21 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#000000',
  },
  excludeField: {
    height: A.fieldHeight * scaleX,
    paddingHorizontal: A.noneInset * scaleX,
    justifyContent: 'center',
  },
  value: {
    fontSize: A.valueFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  publish: {
    marginTop: A.publishTop * scaleX,
    height: A.publishHeight * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishDisabled: {
    opacity: 0.5,
  },
  publishText: {
    fontSize: A.publishFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancel: {
    alignSelf: 'center',
    marginTop: A.cancelTop * scaleX,
  },
  cancelText: {
    fontSize: A.publishFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.glyph,
  },
});
