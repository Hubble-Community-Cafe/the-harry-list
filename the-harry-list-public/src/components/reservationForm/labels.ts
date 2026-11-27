// Guest-facing names and one-line explanations of the special activities.
export const SPECIAL_ACTIVITY_LABELS: Record<string, string> = {
  GRADUATION: 'Graduation / PhD Defense', // matches the backend's SpecialActivity name, which the form shows
  EAT_A_LA_CARTE: 'Eat a la carte',
  EAT_CATERING: 'Catering',
  CATERING_CORONA_ROOM: 'Catering for Corona Room event',
};

export const SPECIAL_ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  GRADUATION: 'Celebrating a graduation or PhD defense',
  EAT_A_LA_CARTE: 'Order from the menu (max 15 guests)',
  EAT_CATERING: 'Catered food for your event',
  CATERING_CORONA_ROOM: 'Catering for a Corona Room event (Hubble only)',
};

// Guest-facing location names; an empty value means the guest has no preference.
export const LOCATION_LABELS: Record<string, string> = {
  HUBBLE: 'Hubble',
  METEOR: 'Meteor',
  NO_PREFERENCE: 'No preference',
};

export const locationLabel = (value: string | null | undefined) =>
  (value && LOCATION_LABELS[value]) || LOCATION_LABELS.NO_PREFERENCE;
