// js/config.js

export const questions = [
  {
    id: "sofa",
    text: "Sofa is full shrinked and wrapped in blankets:",
    options: ["YES", "NO", "NO SOFA"], // [cite: 3]
    itemName: "Sofa", // [cite: 3]
  },
  {
    id: "mattress",
    text: "Mattress in box, full shrinked and wrapped in blankets:",
    options: ["YES", "NO", "NO MATTRESS"], // [cite: 3]
    itemName: "Mattress", // [cite: 3]
  },
  {
    id: "wardrobe",
    text: "Wardrobe with only clothes/pillows inside:",
    options: ["YES", "NO", "NO WARDROBE"],
    itemName: "Wardrobe",
  },
  {
    id: "tvbox",
    text: "TV Box with only TV or Paintings inside:",
    options: ["YES", "NO", "NO TV BOX"],
    itemName: "TV Box",
  },
  {
    id: "paintings",
    text: "Paintings or glass in TV Box are separated from each other by boxes:",
    options: ["YES", "NO", "NO PAINTING/GLASS"],
    itemName: "Paintings/Glass",
  },
  {
    id: "corners",
    text: "Corners/Cardboard are placed on all furniture where required:",
    options: ["YES", "NO"],
    itemName: "Corners/Cardboard",
  },
  {
    id: "wooden",
    text: "Wooden items are full wrapped in blankets:",
    options: ["YES", "NO", "NO WOODEN PARTS"],
    itemName: "Wooden Items",
  },
  {
    id: "leather",
    text: "Leather items are wrapped in blankets without shrink:",
    options: ["YES", "NO", "NO LEATHER ITEMS"],
    itemName: "Leather Items",
  },
  {
    id: "suitcases",
    text: "Suitcases are full shrinked:",
    options: ["YES", "NO", "NO SUITCASES"],
    itemName: "Suitcases",
  },
  {
    id: "lamps",
    text: "Lamps in Boxes/Bubble wrap/wrapped in blankets:",
    options: ["YES", "NO", "NO LAMPS"],
    itemName: "Lamps",
  },
  {
    id: "bikes",
    text: "Bicycle/Peloton is full wrapped in blankets:",
    options: ["YES", "NO", "NO BIKES"],
    itemName: "Bicycle/Peloton",
  },
  {
    id: "rugs",
    text: "Rugs/Carpets are full shrinked:",
    options: ["YES", "NO", "NO RUGS"],
    itemName: "Rugs/Carpets",
  },
  {
    id: "hardware",
    text: "Hardware Box:",
    options: ["YES", "NO"],
    itemName: "Hardware Box",
  },
];

export const defaultValuesConfig = {
  sofa: "NO SOFA",
  mattress: "NO MATTRESS",
  wardrobe: "NO WARDROBE",
  tvbox: "NO TV BOX",
  paintings: "NO PAINTING/GLASS",
  corners: "YES",
  wooden: "YES",
  leather: "NO LEATHER ITEMS",
  suitcases: "NO SUITCASES",
  lamps: "NO LAMPS",
  bikes: "NO BIKES",
  rugs: "NO RUGS",
  hardware: "YES",
};

export const keywordMap = {
  sofa: [
    "sofa",
    "couch",
    "ottoman",
    "loveseat",
    "settee",
    "sectional",
    "sofa bed",
  ],
  mattress: ["mattress", "box spring", "boxspring"],
  wardrobe: ["wardrobe", "wardrobe box", "armoire"],
  tvbox: ["tv box", "tvbox"],
  paintings: ["painting", "glass", "picture", "art", "canvas", "mirror"],
  leather: ["leather"],
  suitcases: ["suitcase"],
  lamps: ["lamp"],
  bikes: ["bike", "bicycle", "peloton", "exercise bike"],
  rugs: ["rug", "carpet"],
  hardware: ["hardware", "hardware box"],
};

export const attentionFieldIds = []; // "wooden" removed

export const sheetDataInputIds = [
  "sheetWarehouse",
  "sheetAddress",
  "sheetPallets",
  "sheetItems",
  "sheetEmployeeName",
  "sheetBingoStatusOK",
  "sheetBingoDetails",
  "sheetMatTV",
  "sheetMatWR",
  "sheetMatBL",
  "useLoadingDock",
];

export const ALL_INPUT_IDS_FOR_RESET_STATIC = [
  "clientName",
  "job",
  "cuFt",
  "generalComments",
  "rating",
  "pdfFile",
  "sheetWarehouse",
  "sheetAddress",
  "sheetPallets",
  "sheetItems",
  "sheetEmployeeName",
  "sheetBingoStatusOK",
  "sheetBingoDetails",
  "sheetMatTV",
  "sheetMatWR",
  "sheetMatBL",
  "useLoadingDock",
  "enablePhotoCommentsToggle", // [cite: 13]
  "spreadsheetIdInput",
  "sheetNameInput",
  "startRowInput",
  // Added new inputs for Sheets display configuration
  "sheetsColumnsToDisplay",
  "sheetsRowsToDisplay",
];

// Default preferences for Sheets data display,
// can be overridden by what's in localStorageHandler.js if already saved by user.
export const defaultSheetsDisplayPrefs = {
  columnsToFetch: "B,C,E", // Default columns to fetch and display
  maxRows: "200", // Default number of rows to fetch and display
};
