import { Redirect } from 'expo-router';

/** Placeholder route — create is opened via the centered tab button. */
export default function CreateTab() {
  return <Redirect href="/(tabs)" />;
}
