import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGridEditor, type EditablePhoto } from '@/components/media/PhotoGridEditor';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { PERMISSIONS } from '@/domain/rbac/permissions';
import { typography } from '@/theme';
import { useAuth } from '@features/auth/hooks/useAuth';
import {
  fetchTicketDetail,
  removeTicketPhotos,
  updateTicketDetails,
  uploadTicketPhotos,
  type TicketDetail,
} from '../services/tickets';

const C = {
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  field: '#f9fafc',
  border: 'rgba(90,117,157,0.25)',
  danger: '#e5484d',
} as const;

type Priority = NonNullable<TicketDetail['priority']>;

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'High', color: '#f92424' },
  { value: 'medium', label: 'Medium', color: '#e0a800' },
  { value: 'notUrgent', label: 'Low', color: '#6b7a90' },
];

type Form = { title: string; description: string; priority: Priority | null; photos: EditablePhoto[] };

/**
 * Edit a ticket — its title, description, priority and photos (add from the
 * library or camera, remove, or make one the cover).
 *
 * Opened as a sheet from the ticket's detail screen, for the ticket's author
 * and managers (`tickets.manage`); the database refuses edits from anyone
 * else. Leaving with unsaved changes asks first. Status, assignee and due time
 * stay where they are changed today: the detail screen and the list.
 */
export default function TicketEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { session } = useAuth();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canManage = can(PERMISSIONS.TICKETS_MANAGE);

  const [original, setOriginal] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Permissions fail closed while loading; wait rather than turn a manager away.
    if (permissionsLoading) return;
    let cancelled = false;
    void (async () => {
      try {
        const ticket = id ? await fetchTicketDetail(id) : null;
        if (cancelled) return;
        if (!ticket) {
          toast.show('This ticket is no longer here.', { type: 'error' });
          router.back();
          return;
        }
        if (!canManage && ticket.createdBy?.id !== session?.user?.id) {
          toast.show('Only the person who raised this ticket or a manager can edit it.', { type: 'error' });
          router.back();
          return;
        }
        const initial: Form = {
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          photos: ticket.photos.map((uri) => ({ uri, remote: true })),
        };
        setOriginal(initial);
        setForm(initial);
      } catch (e) {
        if (!cancelled) {
          toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load ticket' });
          router.back();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast, canManage, permissionsLoading, session?.user?.id]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const canSave = !!form && form.title.trim().length > 0 && dirty && !saving;

  const update = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const cancel = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard changes?', 'Your edits to this ticket will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = async () => {
    if (!form || !original || !id || !canSave) return;
    setSaving(true);
    try {
      // Upload the new photos, then write the list in the order on screen.
      const fresh = form.photos.filter((p) => !p.remote).map((p) => p.uri);
      const uploaded = await uploadTicketPhotos(fresh);
      let next = 0;
      const photoUrls = form.photos.map((p) => (p.remote ? p.uri : uploaded[next++]));

      await updateTicketDetails(id, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        photoUrls,
      });

      // Only after the row no longer points at them.
      const kept = new Set(photoUrls);
      void removeTicketPhotos(original.photos.filter((p) => !kept.has(p.uri)).map((p) => p.uri));

      toast.show('Changes saved.', { type: 'success', title: 'Ticket updated' });
      router.back();
    } catch (e) {
      setSaving(false);
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Ticket not saved' });
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'Edit Ticket',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
        headerShadowVisible: false,
        gestureEnabled: !dirty,
        headerLeft: () => (
          <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button">
            <Text style={styles.headerCancel}>Cancel</Text>
          </Pressable>
        ),
        headerRight: () =>
          saving ? (
            <ActivityIndicator color={C.title} />
          ) : (
            <Pressable onPress={save} disabled={!canSave} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.headerSave, !canSave && styles.headerSaveDisabled]}>Save</Text>
            </Pressable>
          ),
      }}
    />
  );

  if (!form) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <PhotoGridEditor photos={form.photos} onChange={(photos) => update({ photos })} />

        <Text style={[styles.label, styles.gap]}>Title</Text>
        <TextInput
          value={form.title}
          onChangeText={(title) => update({ title })}
          placeholder="e.g. TV not working"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={80}
          returnKeyType="next"
        />
        {form.title.trim().length === 0 ? <Text style={styles.error}>A title is required.</Text> : null}

        <Text style={[styles.label, styles.gap]}>Priority</Text>
        <View style={styles.chips}>
          {PRIORITIES.map((o) => {
            const selected = form.priority === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update({ priority: o.value })}
                style={[styles.chip, selected && { borderColor: o.color, backgroundColor: o.color }]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={[styles.chipDot, { backgroundColor: selected ? '#ffffff' : o.color }]} />
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, styles.gap]}>Description</Text>
        <TextInput
          value={form.description}
          onChangeText={(description) => update({ description })}
          placeholder="What is wrong, where exactly, anything the next person should know…"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.notes]}
          multiline
          inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
          textAlignVertical="top"
          maxLength={1000}
        />
        <KeyboardDoneBar />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  content: { padding: 20 },
  headerCancel: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  headerSave: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  headerSaveDisabled: { opacity: 0.35 },
  label: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.ink },
  gap: { marginTop: 22 },
  input: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.field,
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  notes: { minHeight: 120 },
  chips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.field,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.title },
  chipTextSelected: { fontWeight: '700', color: '#ffffff' },
  error: { marginTop: 6, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.danger },
});
