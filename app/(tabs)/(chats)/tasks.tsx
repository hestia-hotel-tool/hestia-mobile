import AnnouncementsScreen from '@features/chat/screens/AnnouncementsScreen';

// Tasks (room assignments) from the Chat screen's "Tasks" row — same list as General.
export default function TaskNotificationsRoute() {
  return <AnnouncementsScreen kind="tasks" />;
}
