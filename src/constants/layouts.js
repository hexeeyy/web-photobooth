export const LAYOUTS = [
  {
    id: 'christmas-2026',
    name: 'Christmas 2026 Frame',
    category: 'Seasonal Frame',
    photoCount: 3,
    aspectRatio: '863 / 1918',
    width: 863,
    height: 1918,
    printSize: 'Custom frame',
    description: 'Festive 2026 frame with three vertical photo slots.',
    badge: 'New',
    customFrame: {
      imageUrl: '/collage_frame_christmas_2026.png',
      canvasWidth: 863,
      canvasHeight: 1918,
      slots: [
        { x: 143, y: 148, w: 576, h: 338 },
        { x: 143, y: 540, w: 576, h: 339 },
        { x: 143, y: 934, w: 576, h: 339 },
      ],
    },
    gridConfig: {
      columns: 1,
      rows: 3,
      watermarkPosition: 'none',
    }
  },
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

export function getAdaptiveGrid(layout, photoCount) {
  const count = Math.max(1, Math.min(12, Number(photoCount) || layout.photoCount));
  if (layout.customFrame) {
    return { columns: 1, rows: count, customSlotCount: count };
  }
  if (layout.id === 'strip-4' || layout.id === 'strip-3') {
    return { columns: 1, rows: count };
  }
  if (layout.id === 'polaroid') {
    if (count === 1) return { columns: 1, rows: 1 };
    if (count <= 4) return { columns: 2, rows: Math.ceil(count / 2) };
    return { columns: 3, rows: Math.ceil(count / 3) };
  }
  if (layout.id === 'postcard-6') {
    return { columns: 2, rows: Math.ceil(count / 2) };
  }
  if (layout.id === 'double-strip-4') {
    return { columns: 2, rows: Math.ceil(count / 2), isDoubleStrip: true };
  }
  const columns = Math.ceil(Math.sqrt(count));
  return { columns, rows: Math.ceil(count / columns) };
}

export function getCustomFrameSlots(customFrame, photoCount) {
  const count = Math.max(1, Math.min(12, Number(photoCount) || customFrame.slots.length));
  if (count === 3) return customFrame.slots;

  let columns;
  let rows;

  if (count === 1) {
    columns = 1;
    rows = 1;
  } else if (count === 2) {
    columns = 1;
    rows = 2;
  } else if (count <= 4) {
    columns = 2;
    rows = 2;
  } else if (count <= 6) {
    columns = 2;
    rows = 3;
  } else if (count <= 9) {
    columns = 3;
    rows = 3;
  } else {
    columns = 3;
    rows = 4;
  }

  const area = { x: 143, y: 148, w: 576, h: 1125 };
  const gap = 18;
  const slotWidth = (area.w - gap * (columns - 1)) / columns;
  const slotHeight = (area.h - gap * (rows - 1)) / rows;
  const slots = [];

  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    slots.push({
      x: area.x + column * (slotWidth + gap),
      y: area.y + row * (slotHeight + gap),
      w: slotWidth,
      h: slotHeight,
    });
  }

  return slots;
}
