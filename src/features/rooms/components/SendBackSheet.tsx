import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { Icon } from '@/components/Icon';
import { AddPhotosField } from '@/components/media/AddPhotosField';
import { MAX_PHOTOS, pickPhotos } from '@/components/media/photoPicker';
import { DESIGN_WIDTH } from '@/utils/responsive';
import { SEND_BACK_REASONS } from '../utils/roomStatusMachine';
import { uploadRoomActionPhotos } from '../services/cleaningReports';

/** What the sheet hands back: the reason for `room_action`, and uploaded photo URLs. */
export type SendBackResult = { reason: string; photoUrls: string[] };

export type SendBackOptions = {
  roomNumber: string;
  /** Reopening an Inspected room (the inspector is told) vs sending a Cleaned room back (the attendant is). */
  fromInspected: boolean;
  /** A reason already chosen elsewhere — the Inspection Checklist's reject — ticked on opening. */
  presetReason?: string;
};

const COMMENT_MAX = 500;

/**
 * Send a room back to Dirty, or reopen an Inspected one — why, in the
 * supervisor's or manager's own words if they like, with photos of what
 * needs fixing.
 *
 * Replaces a dialog that offered three fixed reasons and nothing else. The
 * presets stay (one tap for the common cases, and readable history), but none
 * is forced: a comment alone is enough. One of the two is required, because
 * the person told needs to know what to fix.
 *
 * Photos are uploaded here, on Confirm, so a failed upload keeps the sheet
 * open with everything still filled in.
 */
function SendBackSheet({
  roomNumber,
  fromInspected,
  presetReason,
  onCancel,
  onSubmit,
}: SendBackOptions & { onCancel: () => void; onSubmit: (result: SendBackResult) => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = (n: number) => (n * width) / DESIGN_WIDTH;

  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState<string | null>(presetReason ?? null);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = fromInspected ? `Reopen Room ${roomNumber}?` : `Send Room ${roomNumber} back?`;
  const message = fromInspected
    ? 'The supervisor who inspected it is told why it failed inspection, and the room goes back to Dirty.'
    : 'The attendant is told why, and the room goes back to Dirty.';
  const confirmLabel = fromInspected ? 'Reopen Room' : 'Send Back';

  const addPhotos = async () => {
    const result = await pickPhotos('library', MAX_PHOTOS - photos.length);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    if (result.uris.length > 0) setPhotos((prev) => [...prev, ...result.uris].slice(0, MAX_PHOTOS));
  };

  const confirm = async () => {
    const text = comment.trim();
    if (!selected && !text) {
      setError('Choose a reason or write a comment, so they know what to fix.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const photoUrls = await uploadRoomActionPhotos(photos);
      const reason = selected && text ? `${selected}: ${text}` : selected ?? text;
      setVisible(false);
      onSubmit({ reason, photoUrls });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The photos could not be uploaded. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (busy) return;
    setVisible(false);
    onCancel();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={cancel}>
      <Pressable style={styles.backdrop} onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { borderTopLeftRadius: s(20), borderTopRightRadius: s(20) }]}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: s(24), paddingTop: s(24), paddingBottom: s(16) }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { fontSize: s(20) }]}>{title}</Text>
            <Text style={[styles.message, { fontSize: s(15), marginTop: s(6) }]}>{message}</Text>
            <View style={[styles.divider, { marginVertical: s(16) }]} />

            <Text style={[styles.label, { fontSize: s(15) }]}>Reason</Text>
            {SEND_BACK_REASONS.map((reason) => {
              const checked = selected === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonRow, { marginTop: s(14) }]}
                  onPress={() => setSelected(checked ? null : reason)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                >
                  {checked ? (
                    <View style={[styles.box, { width: s(28), height: s(28), marginRight: s(16) }]}>
                      <Icon name="action-checkbox-checked" size={s(28)} color="#5a759d" />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.box,
                        styles.boxEmpty,
                        { width: s(28), height: s(28), marginRight: s(16), borderRadius: s(4) },
                      ]}
                    />
                  )}
                  <Text style={[styles.reasonLabel, { fontSize: s(15) }]}>{reason}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.label, { fontSize: s(15), marginTop: s(24) }]}>Comment</Text>
            <TextInput
              style={[
                styles.comment,
                { marginTop: s(10), height: s(110), borderRadius: s(7), padding: s(14), fontSize: s(15) },
              ]}
              placeholder="What needs fixing? (optional if you chose a reason)"
              placeholderTextColor="#999999"
              multiline
              maxLength={COMMENT_MAX}
              value={comment}
              onChangeText={(t) => {
                setComment(t);
                if (error) setError(null);
              }}
              inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
              textAlignVertical="top"
            />
            <KeyboardDoneBar />

            <Text style={[styles.label, { fontSize: s(15), marginTop: s(24), marginBottom: s(10) }]}>Photos</Text>
            <AddPhotosField
              photos={photos}
              onAdd={() => void addPhotos()}
              onRemove={(index) => setPhotos((prev) => prev.filter((_, i) => i !== index))}
              subtitle="Show what needs fixing (optional)"
            />

            {error ? (
              <Text style={[styles.error, { fontSize: s(14), marginTop: s(14) }]} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={{ paddingHorizontal: s(24), paddingBottom: insets.bottom + s(12), gap: s(10) }}>
            <TouchableOpacity
              style={[styles.primary, { height: s(56), borderRadius: s(10) }, busy && styles.primaryBusy]}
              onPress={() => void confirm()}
              disabled={busy}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.primaryText, { fontSize: s(17) }]}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondary, { height: s(52), borderRadius: s(10) }]}
              onPress={cancel}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryText, { fontSize: s(17) }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * `const reason = await sendBack.ask({...})` — resolves with the reason and
 * photo URLs, or null when cancelled. Render `sendBack.element` once in the
 * screen.
 */
export function useSendBackSheet() {
  const [request, setRequest] = useState<{
    options: SendBackOptions;
    resolve: (result: SendBackResult | null) => void;
  } | null>(null);

  const ask = useCallback(
    (options: SendBackOptions) =>
      new Promise<SendBackResult | null>((resolve) => setRequest({ options, resolve })),
    []
  );

  const element = request ? (
    <SendBackSheet
      {...request.options}
      onCancel={() => {
        request.resolve(null);
        setRequest(null);
      }}
      onSubmit={(result) => {
        request.resolve(result);
        setRequest(null);
      }}
    />
  ) : null;

  return { ask, element };
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', maxHeight: '92%' },
  title: { fontFamily: 'Helvetica', fontWeight: '700', color: '#607aa1' },
  message: { fontFamily: 'Helvetica', fontWeight: '300', color: '#000000' },
  divider: { height: 1, backgroundColor: '#e3e3e3' },
  label: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
  reasonRow: { flexDirection: 'row', alignItems: 'center' },
  box: { justifyContent: 'center', alignItems: 'center' },
  boxEmpty: { borderWidth: 2, borderColor: '#5a759d' },
  reasonLabel: { flex: 1, fontFamily: 'Helvetica', fontWeight: '400', color: '#000000' },
  comment: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
  },
  error: { color: '#f92424', textAlign: 'center' },
  primary: { backgroundColor: '#5a759d', justifyContent: 'center', alignItems: 'center' },
  primaryBusy: { opacity: 0.7 },
  primaryText: { fontFamily: 'Helvetica', fontWeight: '700', color: '#ffffff' },
  secondary: { backgroundColor: '#eeeef2', justifyContent: 'center', alignItems: 'center' },
  secondaryText: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
});
