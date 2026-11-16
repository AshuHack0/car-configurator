import type { PhotoProblem } from '@/types/identify';
import type { LocalPhotoIssue } from '@/lib/resizeImage';

/** Every photo problem we can report, from the browser check or from the AI, with how to fix it. */
export const PHOTO_ISSUE_TEXT: Record<PhotoProblem | LocalPhotoIssue, { label: string; fix: string }> = {
  too_small: { label: 'Low resolution', fix: 'Use the original photo from your camera, not a screenshot or a thumbnail.' },
  too_dark: { label: 'Too dark', fix: 'Shoot in daylight or a well-lit place; avoid night shots and deep shade.' },
  too_bright: { label: 'Overexposed', fix: 'Avoid direct sun behind the car and strong glare; try a slightly different angle.' },
  too_blurry: { label: 'Blurry', fix: 'Hold the phone steady, tap the car to focus, and wipe the lens.' },
  too_far: { label: 'Car too small', fix: 'Step closer so the car fills most of the frame.' },
  cropped: { label: 'Car cut off', fix: 'Step back so the whole car, including both wheels on that side, is in frame.' },
  obstructed: { label: 'Car blocked', fix: 'Make sure people, poles or other cars are not in front of your car.' },
  not_a_car: { label: 'No car found', fix: 'Upload a photo that shows the outside of your car.' },
  interior_only: { label: 'Interior only', fix: 'Interior photos can’t identify the model; add a photo of the outside.' },
  other_car: { label: 'Different car', fix: 'All photos should show the same car — remove the one that doesn’t match.' },
};

/** The short "how to photograph your car" guide shown whenever a photo has a problem. */
export const PHOTO_TIPS = [
  'Daylight or a bright place — no night shots',
  'The whole car in frame, filling most of the photo',
  'Front three-quarter view works best: headlights, grille and one side',
  'Phone held steady and focused on the car — no blur',
  'Nothing blocking the car; no filters or heavy edits',
];
