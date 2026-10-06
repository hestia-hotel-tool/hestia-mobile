import AnnouncementsScreen from '@features/chat/screens/AnnouncementsScreen';

// Inside the Chat tab group, so it inherits `(tabs)/(chats)`'s permission and
// the tab bar keeps Chat highlighted.
export default function GeneralNotificationsRoute() {
  return <AnnouncementsScreen kind="general" />;
}
