import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { MAX_PHOTOS, choosePhotoSource, pickPhotos, type PhotoSource } from '@/components/media/photoPicker';
import { useToast } from '@/contexts/ToastContext';
import type { AssignmentDepartment } from '@/domain/assignments';
import { useAuth } from '@features/auth/hooks/useAuth';
import UrgencyPicker, { urgencyToTicketPriority } from '@features/tickets/components/UrgencyPicker';
import { uploadTicketPhotos } from '@features/tickets/services/tickets';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { inspectionImage } from '../../constants/inspectionImages';
import {
  raiseRoomInspectionTickets,
  type InspectionItem,
  type InspectionTicketDraft,
  type RoomInspection,
} from '../../services/roomInspection';
import {
  inspectionDraftKey,
  loadInspectionTicketsDraft,
  saveInspectionTicketsDraft,
  type InspectionIssueDraft,
  type InspectionTicketsDraft,
} from '../../store/inspectionTicketDrafts';
import { formatInspectionStamp } from '../../utils/generateInspectionReport';
import InspectionReportModal from './InspectionReportModal';

export type InspectionTicketsPanelProps = {
  roomId: string;
  roomNumber: string;
  roomCode?: string;
  department: AssignmentDepartment;
  inspection: RoomInspection;
  /** The room's technician or a lead: may raise the tickets. */
  canWork: boolean;
  /** Tickets were raised: reload the inspection. */
  onTicketsRaised: () => void;
};

const fresh = (item: InspectionItem): InspectionIssueDraft => ({
  title: item.note ?? '',
  urgency: 'high',
  pictures: [],
});

/**
 * The Checklist tab once submitted — Figma 4759:1554. "Checklist Complete"
 * with the time and View Report (the submitted checklist, InspectionReportModal), then "Create Checklist Ticket":
 * every issue as a card — the first open, the rest folded — each with its own
 * title (the technician's note to start with), photos and urgency. One
 * "Create Ticket" raises them all; "Save draft and continue later" keeps the
 * form on this device (it also saves itself as it is filled).
 */
export default function InspectionTicketsPanel({
  roomId,
  roomNumber,
  roomCode,
  department,
  inspection,
  canWork,
  onTicketsRaised,
}: InspectionTicketsPanelProps) {
  const toast = useToast();
  const userId = useAuth().session?.user?.id ?? null;
  const draftKey = inspectionDraftKey(roomId, inspection.serviceDay);

  const issues = useMemo(() => inspection.items.filter((i) => i.result === 'issue'), [inspection]);
  const open = useMemo(() => issues.filter((i) => !i.ticketId), [issues]);

  const [form, setForm] = useState<InspectionTicketsDraft>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const loaded = useRef(false);

  // The saved draft, if any, over the notes.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = userId ? await loadInspectionTicketsDraft(userId, draftKey) : null;
      if (!alive) return;
      loaded.current = true;
      setForm(saved ?? {});
    })();
    return () => {
      alive = false;
    };
  }, [userId, draftKey]);

  // Autosave, like ticket drafts.
  useEffect(() => {
    if (!loaded.current || !userId) return;
    void saveInspectionTicketsDraft(userId, draftKey, Object.keys(form).length ? form : null);
  }, [form, userId, draftKey]);

  const current = expanded && open.some((i) => i.id === expanded) ? expanded : (open[0]?.id ?? null);
  const draftOf = (item: InspectionItem) => form[item.id] ?? fresh(item);
  const patch = (item: InspectionItem, change: Partial<InspectionIssueDraft>) =>
    setForm((f) => ({ ...f, [item.id]: { ...(f[item.id] ?? fresh(item)), ...change } }));

  const addPhotos = (item: InspectionItem) =>
    choosePhotoSource((source: PhotoSource) =>
      void (async () => {
        const have = draftOf(item).pictures;
        const result = await pickPhotos(source, MAX_PHOTOS - have.length);
        if ('error' in result) {
          toast.show(result.error, { type: 'error' });
          return;
        }
        if (result.uris.length) patch(item, { pictures: [...have, ...result.uris].slice(0, MAX_PHOTOS) });
      })()
    );

  const createTickets = async () => {
    const untitled = open.find((i) => !draftOf(i).title.trim());
    if (untitled) {
      setExpanded(untitled.id);
      toast.show(`Add a title for ${untitled.name}.`, { type: 'info', title: 'Title missing' });
      return;
    }
    setCreating(true);
    try {
      const tickets: InspectionTicketDraft[] = [];
      for (const item of open) {
        const d = draftOf(item);
        tickets.push({
          itemId: item.id,
          title: d.title.trim(),
          priority: urgencyToTicketPriority(d.urgency),
          photoUrls: await uploadTicketPhotos(d.pictures),
        });
      }
      const n = await raiseRoomInspectionTickets(roomId, department, tickets);
      if (userId) await saveInspectionTicketsDraft(userId, draftKey, null);
      setForm({});
      toast.show(n === 1 ? '1 ticket created.' : `${n} tickets created.`, { type: 'success' });
      onTicketsRaised();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'The tickets could not be created.', { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const saveDraft = async () => {
    if (!userId) return;
    await saveInspectionTicketsDraft(userId, draftKey, form);
    toast.show('Draft saved. Pick it up here any time today.', { type: 'success' });
  };

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 4783:1994 — Checklist Complete. */}
      <View style={styles.complete}>
        <View style={styles.tick}>
          <Icon name="action-inspect-tick" size={11.2 * scaleX} color="#ffffff" />
        </View>
        <View style={styles.completeText}>
          <Text style={styles.completeTitle}>Checklist Complete</Text>
          {inspection.completedAt ? (
            <Text style={styles.completeWhen}>{formatInspectionStamp(inspection.completedAt)}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.report} onPress={() => setReportOpen(true)} accessibilityRole="button">
          <Text style={styles.reportText}>View Report</Text>
        </TouchableOpacity>
      </View>

      {issues.length === 0 ? (
        <Text style={styles.allGood}>All items good — no tickets needed.</Text>
      ) : (
        <>
          <Text style={styles.heading}>Create Checklist Ticket</Text>
          <Text style={styles.issuesCount}>{`Issues(${issues.length})`}</Text>

          {issues.map((item) => {
            const raised = !!item.ticketId;
            const isOpen = canWork && !raised && item.id === current;
            const header = <IssueHeader item={item} raised={raised} large={!isOpen} />;
            if (!isOpen) {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.folded}
                  onPress={() => setExpanded(item.id)}
                  disabled={raised || !canWork}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: false }}
                >
                  {header}
                </TouchableOpacity>
              );
            }
            const d = draftOf(item);
            return (
              <View key={item.id} style={styles.card}>
                {header}
                <Text style={styles.label}>Add Title</Text>
                <TextInput
                  style={styles.titleInput}
                  value={d.title}
                  onChangeText={(title) => patch(item, { title })}
                  placeholder="What needs doing?"
                  placeholderTextColor="#a0a0a0"
                  maxLength={200}
                  accessibilityLabel={`Ticket title for ${item.name}`}
                />

                <Text style={styles.label}>Add Photo</Text>
                <View style={styles.photos}>
                  {d.pictures.map((uri, idx) => (
                    <View key={`${uri}-${idx}`} style={styles.photo}>
                      <Image source={{ uri }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => patch(item, { pictures: d.pictures.filter((_, i) => i !== idx) })}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel="Remove photo"
                      >
                        <Text style={styles.removePhotoText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {d.pictures.length < MAX_PHOTOS ? (
                    <TouchableOpacity
                      style={styles.photo}
                      onPress={() => addPhotos(item)}
                      accessibilityRole="button"
                      accessibilityLabel="Add photo"
                    >
                      <Icon name="action-add-photo" size={29 * scaleX} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.label}>Urgency</Text>
                <UrgencyPicker value={d.urgency} onChange={(urgency) => patch(item, { urgency })} style={styles.urgency} />
              </View>
            );
          })}

          {canWork && open.length > 0 ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.create}
                onPress={() => void createTickets()}
                disabled={creating}
                accessibilityRole="button"
              >
                {creating ? (
                  <ActivityIndicator color="#5a759d" />
                ) : (
                  <Text style={styles.createText}>Create Ticket</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void saveDraft()} disabled={creating} accessibilityRole="button">
                <Text style={styles.saveDraft}>Save draft and continue later</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
      <InspectionReportModal
        visible={reportOpen}
        roomNumber={roomNumber}
        roomCode={roomCode}
        inspection={inspection}
        onClose={() => setReportOpen(false)}
      />
    </ScrollView>
  );
}

/** 4759:1645 — the pink band: the item's picture with the red cross on its corner, the name in red. */
function IssueHeader({ item, raised, large }: { item: InspectionItem; raised: boolean; large: boolean }) {
  const image = inspectionImage(item.imageKey);
  return (
    <View style={styles.band}>
      <View>
        <View style={[styles.picture, large && styles.pictureLarge]}>
          {image ? (
            <Image source={image} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <Text style={styles.initial}>{item.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.cross}>
          <Icon name="action-inspect-cross" size={10.62 * scaleX} color="#ffffff" />
        </View>
      </View>
      <View style={styles.bandText}>
        <Text style={styles.bandName} numberOfLines={2}>
          {item.name}
        </Text>
        {raised ? <Text style={styles.raised}>Ticket created</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 20 * scaleX, paddingBottom: 40 * scaleX },

  /* 4783:1994: #f1f6fc, 406 x 69, centred. */
  complete: {
    marginHorizontal: 17 * scaleX,
    height: 69 * scaleX,
    backgroundColor: '#f1f6fc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14 * scaleX,
    paddingRight: 14 * scaleX,
  },
  tick: {
    width: 34 * scaleX,
    height: 35 * scaleX,
    backgroundColor: '#6fe36f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: { flex: 1, marginLeft: 21 * scaleX },
  completeTitle: { fontSize: 14 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#1e1e1e' },
  completeWhen: {
    marginTop: 6 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  report: {
    width: 135.6 * scaleX,
    height: 45.5 * scaleX,
    borderRadius: 45 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: { fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary, color: '#334866' },

  allGood: {
    marginTop: 32 * scaleX,
    marginHorizontal: 13 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#41d541',
    fontWeight: '700',
  },
  heading: {
    marginTop: 32 * scaleX,
    marginLeft: 13 * scaleX,
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  issuesCount: {
    marginTop: 6 * scaleX,
    marginLeft: 14 * scaleX,
    marginBottom: 16 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#f92424',
  },

  /* 4759:1635 — the open issue's card, 427 wide; the band 14 in. */
  card: {
    marginHorizontal: 9 * scaleX,
    marginBottom: 14 * scaleX,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 10 * scaleX,
    paddingHorizontal: 12 * scaleX,
    paddingTop: 14 * scaleX,
    paddingBottom: 43 * scaleX,
    backgroundColor: '#ffffff',
  },
  /* 4759:1691 — a folded issue is just its band. */
  folded: { marginHorizontal: 13 * scaleX, marginBottom: 14 * scaleX },
  band: {
    minHeight: 97 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: '#feefef',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 25 * scaleX,
    paddingRight: 16 * scaleX,
    paddingVertical: 14 * scaleX,
  },
  picture: {
    width: 68 * scaleX,
    height: 69 * scaleX,
    borderRadius: 6 * scaleX,
    borderWidth: 1,
    borderColor: '#f2f1f1',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureLarge: { width: 74 * scaleX, height: 74 * scaleX, borderColor: '#e3e3e3' },
  initial: { fontSize: 24 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#5a759d' },
  /* The 25 x 26 red cross over the picture's bottom-right corner. */
  cross: {
    position: 'absolute',
    right: -12 * scaleX,
    bottom: -9 * scaleX,
    width: 25 * scaleX,
    height: 26 * scaleX,
    backgroundColor: '#f92424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandText: { flex: 1, marginLeft: 28 * scaleX },
  bandName: { fontSize: 16 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#f92424' },
  raised: { marginTop: 4 * scaleX, fontSize: 12 * scaleX, fontFamily: typography.fontFamily.primary, color: '#41d541', fontWeight: '700' },

  label: {
    marginTop: 21 * scaleX,
    marginLeft: 8 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  titleInput: {
    marginTop: 8 * scaleX,
    marginHorizontal: 8 * scaleX,
    paddingVertical: 6 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
  },
  /* 66 x 67 tiles, 31 apart. */
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 31 * scaleX, marginTop: 14 * scaleX, marginLeft: 8 * scaleX },
  photo: {
    width: 66 * scaleX,
    height: 67 * scaleX,
    borderRadius: 6 * scaleX,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  photoImage: { width: '100%', height: '100%', borderRadius: 6 * scaleX },
  removePhoto: {
    position: 'absolute',
    top: -8 * scaleX,
    right: -8 * scaleX,
    width: 20 * scaleX,
    height: 20 * scaleX,
    borderRadius: 10 * scaleX,
    backgroundColor: '#334866',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: { color: '#ffffff', fontSize: 14 * scaleX, lineHeight: 16 * scaleX, fontWeight: '700' },
  urgency: { marginTop: 22 * scaleX, marginHorizontal: 4 * scaleX },

  /* 4759:1676 — the pink-edged pill, 152 x 60; the draft link 28 under it. */
  actions: { alignItems: 'center', marginTop: 59 * scaleX },
  create: {
    minWidth: 152 * scaleX,
    height: 60 * scaleX,
    paddingHorizontal: 24 * scaleX,
    borderRadius: 45 * scaleX,
    borderWidth: 1,
    borderColor: '#ff4dd8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { fontSize: 16 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#5a759d' },
  saveDraft: {
    marginTop: 28 * scaleX,
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
  },
});
