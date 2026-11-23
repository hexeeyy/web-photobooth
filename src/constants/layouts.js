export const LAYOUTS = [
  {
    id: 'strip-4',
    name: 'Classic 4-Cut Strip',
    category: 'Photostrip (2" x 6")',
    photoCount: 4,
    aspectRatio: '1 / 3',
    width: 1200,
    height: 3600,
    printSize: '2x6 in',
    description: 'Iconic Korean & Japanese 4-cut vertical strip with bottom watermark brand.',
    badge: 'Most Popular',
    gridConfig: {
      columns: 1,
      rows: 4,
      watermarkPosition: 'bottom',
    }
  },
  {
    id: 'strip-3',
    name: 'Retro 3-Cut Strip',
    category: 'Photostrip (2" x 6")',
    photoCount: 3,
    aspectRatio: '1 / 3',
    width: 1200,
    height: 3600,
    printSize: '2x6 in',
    description: 'Vintage 3-shot layout with larger photos and elegant date/event stamp.',
    badge: 'Retro',
    gridConfig: {
      columns: 1,
      rows: 3,
      watermarkPosition: 'bottom',
    }
  },
  {
    id: 'grid-2x2',
    name: 'Square 2x2 Grid',
    category: 'Postcard (4" x 4")',
    photoCount: 4,
    aspectRatio: '1 / 1.15',
    width: 2400,
    height: 2760,
    printSize: '4x4.5 in',
    description: 'Instagram-ready modern square quad collage with footer branding.',
    badge: 'Modern',
    gridConfig: {
      columns: 2,
      rows: 2,
      watermarkPosition: 'bottom',
    }
  },
  {
    id: 'postcard-6',
    name: '6-Shot Party Postcard',
    category: 'Postcard (4" x 6")',
    photoCount: 6,
    aspectRatio: '2 / 3',
    width: 2400,
    height: 3600,
    printSize: '4x6 in',
    description: '6 shots arranged 2x3, ideal for group parties and weddings.',
    badge: 'Group Shots',
    gridConfig: {
      columns: 2,
      rows: 3,
      watermarkPosition: 'bottom',
    }
  },
  {
    id: 'double-strip-4',
    name: 'Double Strip (2-up on 4"x6")',
    category: 'Print 2-Up',
    photoCount: 4,
    aspectRatio: '2 / 3',
    width: 2400,
    height: 3600,
    printSize: '4x6 in (Cut to 2x 2x6)',
    description: 'Prints two identical 4-cut strips side-by-side with a cut line! Perfect for sharing.',
    badge: 'Print Pro',
    gridConfig: {
      columns: 2,
      rows: 4,
      isDoubleStrip: true,
      watermarkPosition: 'bottom',
    }
  },
  {
    id: 'polaroid',
    name: 'Polaroid Style',
    category: 'Classic (3.5" x 4.25")',
    photoCount: 1,
    aspectRatio: '3.5 / 4.25',
    width: 2100,
    height: 2550,
    printSize: '3.5x4.25 in',
    description: 'Single hero frame with wide vintage Polaroid bottom margin for custom notes.',
    badge: 'Solo',
    gridConfig: {
      columns: 1,
      rows: 1,
      watermarkPosition: 'bottom-large',
    }
  }
];

export function getLayoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
