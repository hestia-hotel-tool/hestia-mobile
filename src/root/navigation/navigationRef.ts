import { createNavigationContainerRef } from "expo-router/react-navigation";
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

