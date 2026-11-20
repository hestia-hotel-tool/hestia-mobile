import React, { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Checkbox } from '@/components/ui/Checkbox';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { typography } from '@/theme';
import { REGISTER_FORM, scaleX } from '../../constants/lostAndFoundStyles';

const s = (n: number) => n * scaleX;

/** A loose shape check — the server sends to whatever is queued. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export type EmailGuestChoice = { send: boolean; email: string };

/** Mount it to open it: each opening starts from these values. */
export type EmailGuestSheetProps = {
  /** The address on the guest's booking, or what was typed last time. */
  initialEmail: string;
  /** Yes or No when the sheet opens. */
  initialSend: boolean;
  onSubmit: (choice: EmailGuestChoice) => void;
  /** Tapping above the sheet: back to Confirm, nothing saved. */
  onDismiss: () => void;
};

/**
 * "Important! Send Email to Guest for reclamation?" — Figma 4649:3178.
 *
 * Rises over Confirm when Submit is tapped for an item found in a guest's
 * room: Yes / No, the guest's address (greyed, with Edit to change it) and the
 * real save, labelled Done. The screen above stays visible; tapping it closes the sheet.
 */
export function EmailGuestSheet({ initialEmail, initialSend, onSubmit, onDismiss }: EmailGuestSheetProps) {
  const insets = useSafeAreaInsets();
  const [send, setSend] = useState(initialSend);
  const [email, setEmail] = useState(initialEmail);
  const [editing, setEditing] = useState(initialEmail.trim().length === 0);
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const startEditing = () => {
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = () => {
    if (send && !looksLikeEmail(email)) {
      setShowError(true);
      startEditing();
      return;
    }
    onSubmit({ send, email: email.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
    >
      {/* No dimming in the frame: Confirm stays as it is above the sheet. */}
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Back to Confirm" />

      {/* 4649:3241 — #f9fafc, top corners 24, a 1px #dad3d3 edge. */}
      <View style={[styles.sheet, { paddingBottom: s(56) + insets.bottom }]} accessibilityViewIsModal>
        <Text style={styles.heading}>Important!</Text>
        <Text style={styles.question}>Send Email to Guest for reclamation?</Text>

        <View style={styles.choices}>
          <Choice label="Yes" checked={send} onPress={() => setSend(true)} />
          <Choice label="No" checked={!send} onPress={() => setSend(false)} style={styles.choiceNo} />
        </View>

        {send ? (
          <>
            {/* 4649:3251 — 404 x 75, #afa9ad at 50%, radius 8. */}
            <View style={[styles.emailBox, showError && styles.emailBoxError]}>
              {editing ? (
                <TextInput
                  ref={inputRef}
                  style={[styles.emailText, styles.emailTextEditing]}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (showError) setShowError(false);
                  }}
                  onBlur={() => {
                    if (email.trim()) setEditing(false);
                  }}
                  placeholder="Guest email"
                  placeholderTextColor="rgba(0, 0, 0, 0.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  accessibilityLabel="Guest email"
                />
              ) : (
                <>
                  <Text style={styles.emailText} numberOfLines={1}>
                    {email}
                  </Text>
                  <TouchableOpacity onPress={startEditing} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit guest email">
                    <Text style={styles.edit}>Edit</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {showError ? <Text style={styles.error}>Enter the guest&apos;s email address.</Text> : null}
          </>
        ) : null}

        {/* 4649:3255 — 404 x 70, #5a759d, 27 under the email box. */}
        <TouchableOpacity style={[styles.submit, !send && styles.submitAfterChoices]} onPress={submit} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={styles.submitText}>Done</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Choice({
  label,
  checked,
  onPress,
  style,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable style={[styles.choice, style]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: checked }}>
      {/* 4649:3242 / 3246 — 28 square, a 2px #5a759d outline. */}
      <Checkbox checked={checked} onToggle={onPress} size={s(28)} color="#5a759d" borderWidth={2} accessibilityLabel={label} />
      <Text style={styles.choiceLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    paddingTop: s(41),
    backgroundColor: '#f9fafc',
    borderTopLeftRadius: s(24),
    borderTopRightRadius: s(23),
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#dad3d3',
  },
  /* 4649:3250 — Bold 18, x=24. */
  heading: {
    marginLeft: s(24),
    fontSize: s(18),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  /* 4649:3247 — Regular 16 #5a759d, x=21, 40 under the heading's top. */
  question: {
    marginTop: s(19),
    marginLeft: s(21),
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  /* The boxes 28 under the question, at x=21 and x=108. */
  choices: {
    flexDirection: 'row',
    marginTop: s(28),
    marginLeft: s(21),
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /* No's box at x=108: Yes's row is 28 + 11 + "Yes". */
  choiceNo: {
    position: 'absolute',
    left: s(108 - 21),
  },
  /* 4649:3248 — Regular 16 #5a759d, 11 after the box. */
  choiceLabel: {
    marginLeft: s(11),
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: s(404),
    height: s(75),
    marginTop: s(49),
    paddingLeft: s(20),
    paddingRight: s(27),
    borderWidth: 1,
    borderColor: 'rgba(175, 169, 173, 0.5)',
    borderRadius: s(8),
  },
  emailBoxError: {
    borderColor: '#f92424',
  },
  /* 4649:3252 — Inter Light 17 at 50%. */
  emailText: {
    flex: 1,
    padding: 0,
    fontSize: s(17),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  emailTextEditing: {
    color: '#000000',
  },
  /* 4649:3257 — Regular 16 #5a759d. */
  edit: {
    marginLeft: s(12),
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  error: {
    marginTop: s(6),
    marginLeft: s(20),
    fontSize: s(12),
    fontFamily: typography.fontFamily.primary,
    color: '#f92424',
  },
  submit: {
    alignSelf: 'center',
    width: s(404),
    height: s(70),
    marginTop: s(27),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: REGISTER_FORM.nextButton.backgroundColor,
  },
  /* With No, the button takes the email box's place. */
  submitAfterChoices: {
    marginTop: s(49),
  },
  submitText: {
    fontSize: REGISTER_FORM.nextButton.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.nextButton.text.fontWeight as any,
    color: REGISTER_FORM.nextButton.text.color,
  },
});

export default EmailGuestSheet;
