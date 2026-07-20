export interface PresetModel {
  id: string;
  image: string;
  alt: string;
}

// Deliberately no body-shape/descriptive labels shown in the UI —
// labeling photos by body type risks making users self-conscious
// when picking one. `alt` is for accessibility only, never rendered as visible copy.
export const PRESET_MODELS: PresetModel[] = [
  { id: 'm1', image: '/img/M1.png', alt: 'Model 1' },
  { id: 'm2', image: '/img/M2.png', alt: 'Model 2' },
  { id: 'm3', image: '/img/M3.png', alt: 'Model 3' },
  { id: 'm4', image: '/img/M4.png', alt: 'Model 4' },
  { id: 'm5', image: '/img/M5.png', alt: 'Model 5' },
];
