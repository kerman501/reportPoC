const questions = [
  {
    id: "sofa",
    text: "Sofa is full shrinked and wrapped in blankets:",
    options: ["YES", "NO", "NO SOFA"],
    itemName: "Sofa",
  },
  {
    id: "mattress",
    text: "Mattress in box, full shrinked and wrapped in blankets:",
    options: ["YES", "NO", "NO MATTRESS"],
    itemName: "Mattress",
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
    text: "Paintings/Glass: Secured properly (separated if in TV box, OR wrapped in blankets/cardboard)?",
    options: ["YES", "NO", "NO PAINTINGS/GLASS"],
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

const defaultValuesConfig = {
  sofa: "NO SOFA",
  mattress: "NO MATTRESS",
  wardrobe: "NO WARDROBE",
  tvbox: "NO TV BOX",
  paintings: "NO PAINTINGS/GLASS",
  corners: "YES",
  wooden: "YES",
  leather: "NO LEATHER ITEMS",
  suitcases: "NO SUITCASES",
  lamps: "NO LAMPS",
  bikes: "NO BIKES",
  rugs: "NO RUGS",
  hardware: "YES",
};

const keywordMap = {
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

const attentionFieldIds = []; // "wooden" removed

const sheetDataInputIds = [
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

const FORM_DATA_LOCAL_STORAGE_KEY = "movingReportFormData";

// IDs of all fields to be saved and restored automatically.
const ALL_FIELDS_TO_PERSIST = [
  "clientName",
  "job",
  "cuFt",
  "generalComments",
  "rating",
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
  "enablePhotoCommentsToggle",
  "spreadsheetIdInput",
  "sheetNameInput",
  "startRowInput",
  ...questions.map((q) => q.id), // Add dynamic question IDs
  ...questions.map((q) => `no_comment_textarea_${q.id}`), // Add dynamic comment IDs
];

// IDs of fields to be EXCLUDED from the "Clear Report" functionality.
const FIELDS_TO_EXCLUDE_FROM_CLEAR = [
  "sheetEmployeeName",
  "sheetWarehouse",
  "spreadsheetIdInput",
];
