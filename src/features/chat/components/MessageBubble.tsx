import React from 'react';
import { View, Text, StyleSheet, Platform, Image, TouchableOpacity, Linking } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChatMessage } from '@/types';
import { scaleX } from '../constants/chatStyles';
import { colors } from '@shared/theme';

const SWIPE_REPLY_THRESHOLD = 50;

/** WhatsApp-style waveform: many thin bars with varying heights (seed from duration for consistency) */
const VOICE_WAVEFORM_BARS = [12, 28, 18, 32, 14, 24, 20, 30, 16, 26, 22, 18, 28, 14, 24, 20, 30, 16, 22, 26, 18, 32, 14, 24, 20, 28, 16, 22];

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  isGroup: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onSwipeReply?: (message: ChatMessage) => void;
}

export default function MessageBubble({ message, isCurrentUser, isGroup, onLongPress, onSwipeReply }: MessageBubbleProps) {
  const handleLongPress = () => {
    onLongPress?.(message);
  };

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-25, 25])
        .minDistance(15)
        .onEnd((e) => {
          const dx = e.translationX;
          if (dx < -SWIPE_REPLY_THRESHOLD || dx > SWIPE_REPLY_THRESHOLD) {
            onSwipeReply?.(message);
          }
        }),
    [message, onSwipeReply]
  );

  const Wrapper = onLongPress ? TouchableOpacity : View;
  const wrapperProps = onLongPress ? { onLongPress: handleLongPress, activeOpacity: 1 } : {};

  const content = (
    <Wrapper
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
      {...wrapperProps}
    >
      {/* Sender name for group chats (only for other users) - WhatsApp style above bubble */}
      {isGroup && !isCurrentUser && (
        <Text style={styles.senderName}>{typeof message.senderName === 'string' ? message.senderName : ''}</Text>
      )}

      {/* Message bubble - WhatsApp style with tail */}
      <View
        style={[
          styles.bubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          message.replyTo ? styles.bubbleWithReply : null,
        ]}
      >
        {/* Reply preview: WhatsApp = full-width strip at top of bubble, not a nested “inner message” card */}
        {message.replyTo && (
          <View style={[styles.replyToStrip, isCurrentUser ? styles.replyToStripSent : styles.replyToStripReceived]}>
            <View style={[styles.replyToAccent, isCurrentUser ? styles.replyToAccentSent : styles.replyToAccentReceived]} />
            <View style={styles.replyToStripBody}>
              <Text
                style={[styles.replyToSender, isCurrentUser ? styles.replyToSenderSent : styles.replyToSenderReceived]}
                numberOfLines={1}
              >
                {message.replyTo.senderName}
              </Text>
              <Text
                style={[styles.replyToPreview, isCurrentUser ? styles.replyToPreviewSent : styles.replyToPreviewReceived]}
                numberOfLines={2}
              >
                {message.replyTo.message}
              </Text>
            </View>
          </View>
        )}

        {/* Image Message */}
        {message.type === 'image' && message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={[styles.messageImage, message.replyTo ? styles.messageImageAfterReply : null]}
            resizeMode="cover"
          />
        )}

        {/* File Message */}
        {message.type === 'file' && (message.fileUri || message.fileName) && (
          <TouchableOpacity
            style={[
              styles.fileAttachment,
              isCurrentUser ? styles.fileAttachmentCurrent : styles.fileAttachmentOther,
              message.replyTo ? styles.fileAfterReply : null,
            ]}
            onPress={() => message.fileUri && Linking.openURL(message.fileUri)}
            activeOpacity={0.7}
          >
            <Text style={[styles.fileIcon, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>📎</Text>
            <Text style={[styles.fileName, isCurrentUser ? styles.currentUserText : styles.otherUserText]} numberOfLines={2}>
              {message.fileName ?? message.message?.replace(/^📎\s*/, '') ?? 'File'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Voice Message - WhatsApp style: play | waveform | duration */}
        {message.type === 'voice' && (
          <View style={[styles.voiceMessageContainer, message.replyTo ? styles.voiceAfterReply : null]}>
            <TouchableOpacity
              style={[
                styles.voicePlayButton,
                isCurrentUser ? styles.voicePlayButtonCurrent : styles.voicePlayButtonOther,
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.voicePlayIcon, isCurrentUser ? styles.voicePlayIconCurrent : styles.voicePlayIconOther]}>
                ▶
              </Text>
            </TouchableOpacity>
            <View style={styles.voiceWaveformWrap}>
              {VOICE_WAVEFORM_BARS.map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.voiceBar,
                    { height: h * scaleX },
                    isCurrentUser ? styles.voiceBarCurrent : styles.voiceBarOther,
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.voiceDuration, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
              {formatVoiceDuration(message.voiceDuration ?? 0)}
            </Text>
          </View>
        )}

        {/* @mention on media/voice: WhatsApp caption sits below attachment, same typography flow as body text */}
        {message.taggedUserName &&
          (message.type === 'image' || message.type === 'file' || message.type === 'voice') && (
            <MediaMentionCaption taggedName={message.taggedUserName} isCurrentUser={isCurrentUser} />
          )}

        {/* Text Message — @mentions: same font metrics as body, only color differs (no “boxed” nested look) */}
        {message.type !== 'file' && message.type !== 'image' && message.message != null && message.message !== '' && (
          <MessageTextWithMention
            body={typeof message.message === 'string' ? message.message : String(message.message)}
            taggedName={message.taggedUserName}
            isCurrentUser={isCurrentUser}
          />
        )}

        {/* Timestamp inside bubble - pill style */}
        <View style={[styles.timestampRow, isCurrentUser ? styles.timestampRowSent : styles.timestampRowReceived]}>
          <View style={[styles.timestampPill, isCurrentUser ? styles.timestampPillSent : styles.timestampPillReceived]}>
            <Text style={[styles.timestamp, isCurrentUser ? styles.timestampSent : styles.timestampReceived]}>
              {formatTime(message.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    </Wrapper>
  );

  if (onSwipeReply) {
    return (
      <GestureDetector gesture={panGesture}>
        <View style={styles.slideWrapper}>{content}</View>
      </GestureDetector>
    );
  }
  return content;
}

/** WhatsApp: @mention below photo/file/voice — caption row, same size as message text, not a separate “header”. */
function MediaMentionCaption({
  taggedName,
  isCurrentUser,
}: {
  taggedName: string;
  isCurrentUser: boolean;
}) {
  const label = `@${taggedName.trim()}`;
  const baseStyle = [styles.messageText, isCurrentUser ? styles.currentUserText : styles.otherUserText];
  const mentionStyle = isCurrentUser ? styles.mentionInlineSent : styles.mentionInlineReceived;
  return (
    <Text style={[baseStyle, styles.mediaCaptionWrap]}>
      <Text style={mentionStyle}>{label}</Text>
    </Text>
  );
}

/** WhatsApp: @name flows inline with body — same line height / size as surrounding text, only color weight changes. */
function MessageTextWithMention({
  body,
  taggedName,
  isCurrentUser,
}: {
  body: string;
  taggedName?: string;
  isCurrentUser: boolean;
}) {
  const baseStyle = [styles.messageText, isCurrentUser ? styles.currentUserText : styles.otherUserText];
  if (!taggedName?.trim()) {
    return <Text style={baseStyle}>{body}</Text>;
  }
  const label = `@${taggedName.trim()}`;
  const idx = body.indexOf(label);
  const mentionStyle = isCurrentUser ? styles.mentionInlineSent : styles.mentionInlineReceived;
  if (idx === -1) {
    return (
      <Text style={baseStyle}>
        <Text style={mentionStyle}>{label} </Text>
        {body}
      </Text>
    );
  }
  const before = body.slice(0, idx);
  const after = body.slice(idx + label.length);
  return (
    <Text style={baseStyle}>
      {before}
      <Text style={mentionStyle}>{label}</Text>
      {after}
    </Text>
  );
}

function formatVoiceDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  // Format as HH:MM (24-hour format)
  const hours24 = date.getHours();
  const mins = date.getMinutes();
  const formattedHours = hours24.toString().padStart(2, '0');
  const formattedMins = mins.toString().padStart(2, '0');
  
  // If message is from today, show time only
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `${formattedHours}:${formattedMins}`;
  }
  
  // If message is from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${formattedHours}:${formattedMins}`;
  }
  
  // If message is from this week, show day name
  const daysDiff = Math.floor(diff / 86400000);
  if (daysDiff < 7) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dayNames[date.getDay()]} ${formattedHours}:${formattedMins}`;
  }
  
  // Otherwise show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const styles = StyleSheet.create({
  slideWrapper: {
    alignSelf: 'stretch',
  },
  container: {
    marginVertical: 5 * scaleX,
    maxWidth: '82%',
    paddingHorizontal: 6 * scaleX,
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12.5 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: colors.primary.main,
    marginBottom: 3 * scaleX,
    marginLeft: 6 * scaleX,
    letterSpacing: 0.3,
  },
  mentionInlineSent: {
    fontSize: 15 * scaleX,
    lineHeight: 22 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600' as any,
    color: '#c8f5d4',
  },
  mentionInlineReceived: {
    fontSize: 15 * scaleX,
    lineHeight: 22 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600' as any,
    color: '#0077c8',
  },
  mediaCaptionWrap: {
    marginTop: 4 * scaleX,
    marginBottom: 2 * scaleX,
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14 * scaleX,
    paddingTop: 10 * scaleX,
    paddingBottom: 8 * scaleX,
    borderRadius: 14 * scaleX,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  currentUserBubble: {
    backgroundColor: colors.primary.main,
    borderTopRightRadius: 14 * scaleX,
    borderTopLeftRadius: 14 * scaleX,
    borderBottomLeftRadius: 14 * scaleX,
    borderBottomRightRadius: 4 * scaleX,
    borderWidth: 0,
  },
  otherUserBubble: {
    backgroundColor: colors.background.tertiary,
    borderTopLeftRadius: 14 * scaleX,
    borderTopRightRadius: 14 * scaleX,
    borderBottomRightRadius: 14 * scaleX,
    borderBottomLeftRadius: 4 * scaleX,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  bubbleWithReply: {
    paddingTop: 0,
  },
  /** WhatsApp: quote strip stays inside bubble bounds — no negative margins (avoids bleed/overlap with other rows) */
  replyToStrip: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginBottom: 8 * scaleX,
    paddingVertical: 8 * scaleX,
    paddingRight: 4 * scaleX,
    borderRadius: 8 * scaleX,
  },
  replyToStripSent: {
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  replyToStripReceived: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  replyToAccent: {
    width: 3 * scaleX,
    alignSelf: 'stretch',
    borderRadius: 2 * scaleX,
    marginLeft: 0,
    marginRight: 10 * scaleX,
  },
  replyToAccentSent: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  replyToAccentReceived: {
    backgroundColor: colors.primary.main,
  },
  replyToStripBody: {
    flex: 1,
    minWidth: 0,
  },
  replyToSender: {
    fontSize: 13 * scaleX,
    fontWeight: '600' as any,
    marginBottom: 2 * scaleX,
  },
  replyToSenderSent: {
    color: 'rgba(255,255,255,0.95)',
  },
  replyToSenderReceived: {
    color: colors.text.primary,
  },
  replyToPreview: {
    fontSize: 12.5 * scaleX,
    lineHeight: 17 * scaleX,
  },
  replyToPreviewSent: {
    color: 'rgba(255,255,255,0.82)',
  },
  replyToPreviewReceived: {
    color: colors.text.secondary,
  },
  messageText: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    lineHeight: 22 * scaleX,
    letterSpacing: 0.15,
  },
  currentUserText: {
    color: colors.text.white,
    fontWeight: '400' as any,
  },
  otherUserText: {
    color: colors.text.primary,
    fontWeight: '400' as any,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4 * scaleX,
  },
  timestampRowSent: {
    justifyContent: 'flex-end',
  },
  timestampRowReceived: {
    justifyContent: 'flex-start',
  },
  timestampPill: {
    paddingHorizontal: 8 * scaleX,
    paddingVertical: 4 * scaleX,
    borderRadius: 10 * scaleX,
  },
  timestampPillSent: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  timestampPillReceived: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  timestamp: {
    fontSize: 10.5 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '500' as any,
  },
  timestampSent: {
    color: 'rgba(255,255,255,0.92)',
  },
  timestampReceived: {
    color: colors.text.tertiary,
  },
  messageImage: {
    width: 260 * scaleX,
    maxWidth: '100%',
    aspectRatio: 1,
    borderRadius: 12 * scaleX,
    marginBottom: 4 * scaleX,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  messageImageAfterReply: {
    marginTop: 2 * scaleX,
  },
  fileAfterReply: {
    marginTop: 2 * scaleX,
  },
  voiceAfterReply: {
    marginTop: 2 * scaleX,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10 * scaleX,
    paddingHorizontal: 12 * scaleX,
    borderRadius: 12 * scaleX,
    marginBottom: 6 * scaleX,
    maxWidth: 220 * scaleX,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fileAttachmentCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fileAttachmentOther: {
    backgroundColor: 'rgba(90, 117, 157, 0.1)',
    borderColor: 'rgba(90, 117, 157, 0.15)',
  },
  fileIcon: {
    fontSize: 20 * scaleX,
    marginRight: 10 * scaleX,
  },
  fileName: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    flex: 1,
    fontWeight: '500' as any,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minWidth: 200 * scaleX,
    paddingVertical: 6 * scaleX,
    paddingRight: 4 * scaleX,
  },
  voicePlayButton: {
    width: 46 * scaleX,
    height: 46 * scaleX,
    borderRadius: 23 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scaleX,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  voicePlayButtonCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  voicePlayButtonOther: {
    backgroundColor: 'rgba(90, 117, 157, 0.22)',
  },
  voicePlayIcon: {
    fontSize: 20 * scaleX,
    marginLeft: 4 * scaleX,
  },
  voicePlayIconCurrent: {
    color: colors.text.white,
  },
  voicePlayIconOther: {
    color: colors.primary.main,
  },
  voiceWaveformWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34 * scaleX,
    gap: 2.5 * scaleX,
    marginRight: 12 * scaleX,
  },
  voiceBar: {
    width: 3 * scaleX,
    borderRadius: 2 * scaleX,
    minHeight: 6 * scaleX,
  },
  voiceBarCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  voiceBarOther: {
    backgroundColor: 'rgba(90, 117, 157, 0.55)',
  },
  voiceDuration: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600' as any,
    minWidth: 36 * scaleX,
  },
});

