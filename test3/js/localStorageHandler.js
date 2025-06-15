function getThemePreference() {
  return localStorage.getItem("theme");
}

function saveThemePreference(theme) {
  localStorage.setItem("theme", theme);
}

// --- New generic form state functions ---

/**
 * Saves the provided state object to localStorage.
 * @param {object} state - The form state object to save.
 */
function saveFormState(state) {
  try {
    const jsonState = JSON.stringify(state);
    localStorage.setItem(FORM_DATA_LOCAL_STORAGE_KEY, jsonState);
  } catch (error) {
    console.error("Failed to save form state to localStorage:", error);
  }
}

/**
 * Loads the form state object from localStorage.
 * @returns {object | null} The saved state object, or null if not found or error.
 */
function loadFormState() {
  try {
    const jsonState = localStorage.getItem(FORM_DATA_LOCAL_STORAGE_KEY);
    return jsonState ? JSON.parse(jsonState) : null;
  } catch (error) {
    console.error("Failed to load form state from localStorage:", error);
    return null;
  }
}

/**
 * Clears only the main form data, preserving specified fields.
 */
function clearPartialFormState() {
  const currentState = loadFormState();
  if (!currentState) return;

  const preservedState = {
    fields: {},
    photoComments: {}, // Comments are cleared unless we re-implement matching
  };

  FIELDS_TO_EXCLUDE_FROM_CLEAR.forEach((fieldId) => {
    if (currentState.fields && currentState.fields.hasOwnProperty(fieldId)) {
      preservedState.fields[fieldId] = currentState.fields[fieldId];
    }
  });

  // Save the state object that only contains the preserved fields.
  saveFormState(preservedState);
}
