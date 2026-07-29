import { createNavigationContainerRef } from "expo-router/react-navigation";
import type { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

