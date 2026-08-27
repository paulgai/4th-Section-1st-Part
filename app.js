const stage = document.querySelector(".simulation__stage");
const infoToggle = document.querySelector(".info-toggle");
const fullscreenToggle = document.querySelector(".fullscreen-toggle");
const sceneLabels = document.querySelector(".scene-labels");
const microscopeHotspot = document.querySelector(".hotspot--microscope");
const microscopeScene = document.querySelector(".microscope-scene");
const microscopeCellField = document.querySelector(
  ".microscope-scene__cell-field",
);
const microscopeEmpty = document.querySelector(".microscope-scene__empty");
const microscopeCellTooltip = document.querySelector(
  ".microscope-cell-tooltip",
);
const microscopeBack = document.querySelector(".microscope-scene__back");
const microscopeInstruction = document.querySelector(
  ".microscope-scene__instruction",
);
const microscopeTimeEvolution = document.querySelector(
  ".microscope-scene__time-evolution",
);
const timePassage = document.querySelector(".time-passage");
const dnaModal = document.querySelector(".dna-modal");
const dnaModalTitle = document.querySelector(".dna-modal__title");
const dnaModalImage = document.querySelector(".dna-modal__image");
const dnaModalClose = document.querySelector(".dna-modal__close");
const radiationHotspot = document.querySelector(".hotspot--radiation");
const radiationHint = document.querySelector("#radiation-hint");
const irradiationController = document.querySelector(".irradiation-controller");
const irradiationControllerImage = document.querySelector(
  ".irradiation-controller__image",
);
const irradiationControllerSwitch = document.querySelector(
  ".irradiation-controller__switch",
);
const irradiationControllerPower = document.querySelector(
  ".irradiation-controller__power",
);
const radiationSourceIrradiation = document.querySelector(
  ".radiation-source-irradiation",
);
const samples = [...document.querySelectorAll(".sample")];
const dragStatus = document.querySelector("#drag-status");
const dropZones = {
  home: document.querySelector('[data-drop-zone="home"]'),
  microscope: document.querySelector('[data-drop-zone="microscope"]'),
  radiation: document.querySelector('[data-drop-zone="radiation"]'),
};

const sampleData = new Map([
  [
    samples[0],
    {
      id: "a",
      name: "Δείγμα Α",
      home: { left: 11.5, top: 72.15 },
      irradiationLevels: new Set(),
      viewedDnaStates: new Set(),
      timeEvolutionStatus: "idle",
      timeEvolutionTimers: [],
    },
  ],
  [
    samples[1],
    {
      id: "b",
      name: "Δείγμα Β",
      home: { left: 25.5, top: 72.15 },
      irradiationLevels: new Set(),
      viewedDnaStates: new Set(),
      timeEvolutionStatus: "idle",
      timeEvolutionTimers: [],
    },
  ],
]);

const locations = {
  microscope: { left: 42.8, top: 62.5, name: "στο μικροσκόπιο" },
  radiation: { left: 75, top: 59.5, name: "στην πηγή ακτινοβολίας" },
};

const sampleImages = {
  default: "assets/petri-dish-red-sample.png",
  horizontal: "assets/petri-dish-red-sample-horizontal.png",
};

const microscopeCellImages = [
  "assets/microscope-cell-normal-1.png",
  "assets/microscope-cell-normal-2.png",
  "assets/microscope-cell-normal-3.png",
];

const evolvedCellImages = {
  normal: microscopeCellImages,
  gray: [
    "assets/microscope-cell-gray-1.png",
    "assets/microscope-cell-gray-2.png",
    "assets/microscope-cell-gray-3.png",
  ],
  orange: [
    "assets/microscope-cell-orange-1.png",
    "assets/microscope-cell-orange-2.png",
    "assets/microscope-cell-orange-3.png",
  ],
};

const dnaImages = {
  normal: "assets/dna-normal.png",
  ionized: "assets/dna-brake.png",
};

const microscopeLayoutSeeds = {
  a: 0xa17c9e3d,
  b: 0xb52d41f7,
};

const microscopeFieldDimensions = {
  width: 1080,
  height: 1080,
  cellCount: 400,
};

const highEnergyAffectedPercentage = 25;
const microscopeCellSizeScale = 0.5;
const timeEvolutionDurationMs = 5000;

const microscopeMaskAperture = {
  width: 1920,
  height: 1080,
  radius: 400,
};

const irradiationControllerImages = {
  low: "assets/irradiation-controller-low.png",
  high: "assets/irradiation-controller-high.png",
};

const irradiationEffectImages = {
  low: "assets/radiation-source-low-overlay.png?v=3",
  high: "assets/radiation-source-high-overlay.png?v=3",
};

const sampleWidthPercent = 7;

Object.values(sampleImages).forEach((src) => {
  const image = new Image();
  image.src = src;
});

microscopeCellImages.forEach((src) => {
  const image = new Image();
  image.src = src;
});

[...evolvedCellImages.gray, ...evolvedCellImages.orange].forEach((src) => {
  const image = new Image();
  image.src = src;
});

Object.values(dnaImages).forEach((src) => {
  const image = new Image();
  image.src = src;
});

Object.values(irradiationControllerImages).forEach((src) => {
  const image = new Image();
  image.src = src;
});

Object.values(irradiationEffectImages).forEach((src) => {
  const image = new Image();
  image.src = src;
});

let drag = null;
let irradiationLightTimer = null;
let renderedMicroscopeSampleId = null;
let hoveredMicroscopeCell = null;
const microscopeLayouts = new Map();

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createMicroscopeLayout(sampleId) {
  const random = createSeededRandom(microscopeLayoutSeeds[sampleId]);
  const { width, height, cellCount } = microscopeFieldDimensions;
  const cells = [];
  const maximumAttempts = cellCount * 500;
  let attempts = 0;

  while (cells.length < cellCount && attempts < maximumAttempts) {
    attempts += 1;

    const size = (58 + random() * 24) * microscopeCellSizeScale;
    const collisionRadius = size * 0.43;
    const x = collisionRadius + random() * (width - collisionRadius * 2);
    const y = collisionRadius + random() * (height - collisionRadius * 2);
    const overlapsExistingCell = cells.some((cell) => {
      const horizontalDistance = x - cell.x;
      const verticalDistance = y - cell.y;
      const minimumDistance = collisionRadius + cell.collisionRadius + 3;

      return (
        horizontalDistance * horizontalDistance +
          verticalDistance * verticalDistance <
        minimumDistance * minimumDistance
      );
    });

    if (overlapsExistingCell) {
      continue;
    }

    const rotation = random() * 360;
    const variant = Math.floor(random() * microscopeCellImages.length);

    cells.push({
      x,
      y,
      size,
      collisionRadius,
      rotation,
      variant,
      originalImage: microscopeCellImages[variant],
      stackOrder: cells.length,
    });
  }

  const highEnergyRandom = createSeededRandom(
    microscopeLayoutSeeds[sampleId] ^ 0x9e3779b9,
  );
  const shuffledCellIndexes = cells.map((_, index) => index);

  for (let index = shuffledCellIndexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(highEnergyRandom() * (index + 1));
    [shuffledCellIndexes[index], shuffledCellIndexes[randomIndex]] = [
      shuffledCellIndexes[randomIndex],
      shuffledCellIndexes[index],
    ];
  }

  const affectedCellCount = Math.round(
    cells.length * (highEnergyAffectedPercentage / 100),
  );
  const affectedCellIndexes = shuffledCellIndexes.slice(0, affectedCellCount);
  const evolutionRandom = createSeededRandom(
    microscopeLayoutSeeds[sampleId] ^ 0x7f4a7c15,
  );

  for (let index = affectedCellIndexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(evolutionRandom() * (index + 1));
    [affectedCellIndexes[index], affectedCellIndexes[randomIndex]] = [
      affectedCellIndexes[randomIndex],
      affectedCellIndexes[index],
    ];
  }

  const recoveredCellCount = Math.round(affectedCellCount * 0.5);
  const grayCellCount = Math.round(affectedCellCount * 0.25);

  affectedCellIndexes.forEach((cellIndex, outcomeIndex) => {
    const cell = cells[cellIndex];
    cell.affectedByHighEnergy = true;

    if (outcomeIndex < recoveredCellCount) {
      cell.evolutionOutcome = "normal";
    } else if (outcomeIndex < recoveredCellCount + grayCellCount) {
      cell.evolutionOutcome = "gray";
    } else {
      cell.evolutionOutcome = "orange";
    }
  });

  const transitionCellIndexes = [...affectedCellIndexes];
  const transitionRandom = createSeededRandom(
    microscopeLayoutSeeds[sampleId] ^ 0x3c6ef372,
  );

  for (let index = transitionCellIndexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(transitionRandom() * (index + 1));
    [transitionCellIndexes[index], transitionCellIndexes[randomIndex]] = [
      transitionCellIndexes[randomIndex],
      transitionCellIndexes[index],
    ];
  }

  transitionCellIndexes.forEach((cellIndex, evolutionOrder) => {
    cells[cellIndex].evolutionOrder = evolutionOrder;
  });

  return cells;
}

function getMicroscopeLayout(sampleId) {
  if (!microscopeLayouts.has(sampleId)) {
    microscopeLayouts.set(sampleId, createMicroscopeLayout(sampleId));
  }

  return microscopeLayouts.get(sampleId);
}

function hideMicroscopeCellTooltip() {
  hoveredMicroscopeCell?.classList.remove("is-hoverable");
  hoveredMicroscopeCell = null;
  microscopeCellTooltip.classList.remove("is-visible");
  microscopeCellTooltip.setAttribute("aria-hidden", "true");
}

function showMicroscopeCellTooltip(cell) {
  const isIonizationEvent = cell.classList.contains(
    "microscope-cell--high-energy",
  );
  const cellState = cell.dataset.cellState || "normal";

  if (cellState === "gray") {
    microscopeCellTooltip.textContent = "Κυτταρικός Θάνατος";
  } else if (cellState === "orange") {
    microscopeCellTooltip.textContent = "Μεταλλαγμένο Κύτταρο";
  } else {
    microscopeCellTooltip.textContent = isIonizationEvent
      ? "Καταγράφηκε Συμβάν Ιονισμού"
      : "Φυσιολογικό Κύτταρο";
  }
  microscopeCellTooltip.style.setProperty(
    "--tooltip-x",
    cell.dataset.tooltipX,
  );
  microscopeCellTooltip.style.setProperty(
    "--tooltip-y",
    cell.dataset.tooltipY,
  );
  microscopeCellTooltip.setAttribute("aria-hidden", "false");
  microscopeCellTooltip.classList.add("is-visible");
  hoveredMicroscopeCell?.classList.remove("is-hoverable");
  hoveredMicroscopeCell = cell;
  hoveredMicroscopeCell.classList.add("is-hoverable");
}

function pointerIsInsideMicroscopeAperture(event) {
  const fieldBounds = microscopeCellField.getBoundingClientRect();
  const scaleX = microscopeMaskAperture.width / fieldBounds.width;
  const scaleY = microscopeMaskAperture.height / fieldBounds.height;
  const pointerX = (event.clientX - fieldBounds.left) * scaleX;
  const pointerY = (event.clientY - fieldBounds.top) * scaleY;
  const distanceX = pointerX - microscopeMaskAperture.width / 2;
  const distanceY = pointerY - microscopeMaskAperture.height / 2;

  return (
    distanceX * distanceX + distanceY * distanceY <=
    microscopeMaskAperture.radius * microscopeMaskAperture.radius
  );
}

function getMicroscopeSampleData() {
  const sample = samples.find(
    (candidate) => candidate.dataset.location === "microscope",
  );

  return sample ? sampleData.get(sample) : null;
}

function updateTimeEvolutionAvailability() {
  const data = getMicroscopeSampleData();
  const hasHighEnergyExposure = data?.irradiationLevels.has("high") ?? false;
  const hasViewedBothDnaStates = Boolean(
    data?.viewedDnaStates.has("normal") &&
      data?.viewedDnaStates.has("ionized"),
  );
  const shouldShowButton = hasHighEnergyExposure && hasViewedBothDnaStates;

  microscopeTimeEvolution.hidden = !shouldShowButton;
  microscopeInstruction.hidden = !data || data.timeEvolutionStatus !== "idle";
  timePassage.hidden = !data || data.timeEvolutionStatus !== "running";

  if (!data) {
    return;
  }

  microscopeTimeEvolution.disabled = data.timeEvolutionStatus !== "idle";
  microscopeTimeEvolution.textContent =
    data.timeEvolutionStatus === "running"
      ? "Εξέλιξη σε εξέλιξη…"
      : data.timeEvolutionStatus === "complete"
        ? "Η εξέλιξη ολοκληρώθηκε"
        : "Εξέλιξη στον χρόνο";
}

function openDnaModal(cell) {
  const data = getMicroscopeSampleData();

  if (!data || data.timeEvolutionStatus !== "idle") {
    return;
  }

  const dnaState = cell.classList.contains("microscope-cell--high-energy")
    ? "ionized"
    : "normal";

  hideMicroscopeCellTooltip();
  dnaModalTitle.textContent =
    dnaState === "ionized"
      ? "DNA μετά από συμβάν ιονισμού"
      : "Φυσιολογικό DNA";
  dnaModalImage.src = dnaImages[dnaState];
  dnaModalImage.alt =
    dnaState === "ionized"
      ? "Τρισδιάστατη απεικόνιση DNA με θραύση μετά από συμβάν ιονισμού"
      : "Τρισδιάστατη απεικόνιση φυσιολογικής διπλής έλικας DNA";
  dnaModal.hidden = false;
  dnaModal.setAttribute("aria-hidden", "false");
  data.viewedDnaStates.add(dnaState);
  updateTimeEvolutionAvailability();
  dnaModalClose.focus();
}

function closeDnaModal() {
  dnaModal.hidden = true;
  dnaModal.setAttribute("aria-hidden", "true");
  microscopeBack.focus();
}

function startTimeEvolution() {
  const data = getMicroscopeSampleData();
  const canStart = Boolean(
    data?.irradiationLevels.has("high") &&
      data?.viewedDnaStates.has("normal") &&
      data?.viewedDnaStates.has("ionized") &&
      data?.timeEvolutionStatus === "idle",
  );

  if (!canStart) {
    return;
  }

  data.timeEvolutionStatus = "running";
  data.timeEvolutionTimers = [];
  hideMicroscopeCellTooltip();
  microscopeBack.disabled = true;
  microscopeScene.dataset.evolution = "running";
  updateTimeEvolutionAvailability();
  dragStatus.textContent = "Η εξέλιξη των κυττάρων στον χρόνο ξεκίνησε.";

  const affectedCells = [
    ...microscopeCellField.querySelectorAll(
      '.microscope-cell[data-affected-by-high-energy="true"]',
    ),
  ];
  const overlayPairs = [];

  affectedCells.forEach((cell) => {
    cell.classList.add("microscope-cell--time-transition");

    if (cell.dataset.evolutionOutcome === "normal") {
      return;
    }

    const overlay = document.createElement("img");
    const variant = Number(cell.dataset.cellVariant);
    overlay.className = "microscope-cell-evolution-overlay";
    overlay.src = evolvedCellImages[cell.dataset.evolutionOutcome][variant];
    overlay.alt = "";
    overlay.setAttribute("aria-hidden", "true");
    overlay.draggable = false;
    overlay.style.zIndex = cell.style.zIndex;
    ["--cell-x", "--cell-y", "--cell-size", "--cell-rotation"].forEach(
      (property) => {
        overlay.style.setProperty(
          property,
          cell.style.getPropertyValue(property),
        );
      },
    );
    cell.insertAdjacentElement("afterend", overlay);
    overlayPairs.push({ cell, overlay });
  });

  // Κατοχυρώνει την αρχική κατάσταση πριν ξεκινήσουν τα πεντάδευτερα transitions.
  void microscopeCellField.offsetWidth;

  affectedCells.forEach((cell) => {
    cell.classList.remove("microscope-cell--high-energy");
  });
  overlayPairs.forEach(({ overlay }) => {
    overlay.classList.add("is-visible");
  });

  const completionTimer = window.setTimeout(() => {
    affectedCells.forEach((cell) => {
      cell.classList.remove(
        "microscope-cell--high-energy",
        "microscope-cell--time-transition",
      );
      setMicroscopeCellVisualState(cell, cell.dataset.evolutionOutcome);
    });
    overlayPairs.forEach(({ overlay }) => overlay.remove());
    data.timeEvolutionStatus = "complete";
    data.timeEvolutionTimers = [];
    microscopeBack.disabled = false;
    microscopeScene.dataset.evolution = "complete";
    updateTimeEvolutionAvailability();
    dragStatus.textContent = "Η εξέλιξη των κυττάρων στον χρόνο ολοκληρώθηκε.";
  }, timeEvolutionDurationMs);

  data.timeEvolutionTimers.push(completionTimer);
}

microscopeCellField.addEventListener("pointermove", (event) => {
  const cell = event.target.closest(".microscope-cell");

  if (
    cell &&
    microscopeCellField.contains(cell) &&
    pointerIsInsideMicroscopeAperture(event)
  ) {
    showMicroscopeCellTooltip(cell);
  } else {
    hideMicroscopeCellTooltip();
  }
});

microscopeCellField.addEventListener("pointerout", (event) => {
  const cell = event.target.closest(".microscope-cell");

  if (cell && !cell.contains(event.relatedTarget)) {
    hideMicroscopeCellTooltip();
  }
});

microscopeCellField.addEventListener("click", (event) => {
  const cell = event.target.closest(".microscope-cell");

  if (
    cell &&
    microscopeCellField.contains(cell) &&
    pointerIsInsideMicroscopeAperture(event)
  ) {
    openDnaModal(cell);
  }
});

microscopeCellField.addEventListener(
  "pointerleave",
  hideMicroscopeCellTooltip,
);

dnaModalClose.addEventListener("click", closeDnaModal);

dnaModal.addEventListener("click", (event) => {
  if (event.target === dnaModal) {
    closeDnaModal();
  }
});

microscopeTimeEvolution.addEventListener("click", startTimeEvolution);

function setMicroscopeCellVisualState(cell, cellState) {
  const variant = Number(cell.dataset.cellVariant);
  cell.dataset.cellState = cellState;
  cell.src = evolvedCellImages[cellState][variant];
}

function renderMicroscopeCellField(data) {
  if (renderedMicroscopeSampleId !== data.id) {
    hideMicroscopeCellTooltip();
    const fragment = document.createDocumentFragment();
    const { width, height } = microscopeFieldDimensions;

    getMicroscopeLayout(data.id).forEach((cell) => {
      const image = document.createElement("img");
      image.className = "microscope-cell";
      image.src = microscopeCellImages[cell.variant];
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.draggable = false;
      image.dataset.affectedByHighEnergy = String(
        Boolean(cell.affectedByHighEnergy),
      );
      image.dataset.cellVariant = String(cell.variant);
      image.dataset.originalImage = cell.originalImage;
      image.dataset.originalX = String(cell.x);
      image.dataset.originalY = String(cell.y);
      image.dataset.originalRotation = String(cell.rotation);
      image.dataset.stackOrder = String(cell.stackOrder);
      image.dataset.evolutionOutcome = cell.evolutionOutcome || "normal";
      image.dataset.evolutionOrder = String(cell.evolutionOrder ?? -1);
      image.dataset.tooltipX = `${(cell.x / width) * 100}%`;
      image.dataset.tooltipY = `${((cell.y - cell.size * 0.42) / height) * 100}%`;
      image.style.setProperty("--cell-x", `${(cell.x / width) * 100}%`);
      image.style.setProperty("--cell-y", `${(cell.y / height) * 100}%`);
      image.style.setProperty("--cell-size", `${(cell.size / width) * 100}%`);
      image.style.setProperty("--cell-rotation", `${cell.rotation}deg`);
      image.style.zIndex = String(cell.stackOrder);
      fragment.append(image);
    });

    microscopeCellField.replaceChildren(fragment);
    renderedMicroscopeSampleId = data.id;
  }

  microscopeCellField.setAttribute(
    "aria-label",
    `Πληθυσμός ερυθρών αιμοσφαιρίων του ${data.name}`,
  );
  [...microscopeCellField.children].forEach((cell) => {
    const isAffected = cell.dataset.affectedByHighEnergy === "true";
    const cellState =
      data.timeEvolutionStatus === "complete" && isAffected
        ? cell.dataset.evolutionOutcome
        : "normal";

    setMicroscopeCellVisualState(cell, cellState);
    cell.classList.toggle(
      "microscope-cell--high-energy",
      data.irradiationLevels.has("high") &&
        data.timeEvolutionStatus === "idle" &&
        isAffected,
    );
  });
}

function updateFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);

  fullscreenToggle.setAttribute("aria-pressed", String(isFullscreen));
  fullscreenToggle.setAttribute(
    "aria-label",
    isFullscreen ? "Έξοδος από πλήρη οθόνη" : "Πλήρης οθόνη",
  );
}

if (!document.fullscreenEnabled) {
  fullscreenToggle.hidden = true;
}

fullscreenToggle.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    dragStatus.textContent = "Η πλήρης οθόνη δεν είναι διαθέσιμη σε αυτό το πρόγραμμα περιήγησης.";
  }
});

document.addEventListener("fullscreenchange", updateFullscreenButton);

infoToggle.addEventListener("click", () => {
  const labelsAreVisible = stage.classList.toggle(
    "simulation__stage--info-visible",
  );

  infoToggle.setAttribute("aria-pressed", String(labelsAreVisible));
  infoToggle.setAttribute(
    "aria-label",
    labelsAreVisible ? "Απόκρυψη πληροφοριών" : "Εμφάνιση πληροφοριών",
  );
  sceneLabels.setAttribute("aria-hidden", String(!labelsAreVisible));
});

function updateMicroscopeSpecimen() {
  const sample = samples.find(
    (candidate) => candidate.dataset.location === "microscope",
  );

  if (!sample) {
    microscopeScene.classList.remove("microscope-scene--has-sample");
    microscopeCellField.setAttribute("aria-hidden", "true");
    microscopeEmpty.removeAttribute("aria-hidden");
    microscopeScene.dataset.sample = "none";
    microscopeScene.dataset.irradiation = "none";
    microscopeScene.dataset.evolution = "none";
    updateTimeEvolutionAvailability();
    return "Κενό μικροσκόπιο.";
  }

  const data = sampleData.get(sample);
  const irradiationLevel = data.irradiationLevels.has("high")
    ? "high"
    : data.irradiationLevels.has("low")
      ? "low"
      : "none";

  renderMicroscopeCellField(data);
  microscopeScene.classList.add("microscope-scene--has-sample");
  microscopeCellField.setAttribute("aria-hidden", "false");
  microscopeEmpty.setAttribute("aria-hidden", "true");
  microscopeScene.dataset.sample = data.id;
  microscopeScene.dataset.irradiation = irradiationLevel;
  microscopeScene.dataset.evolution = data.timeEvolutionStatus;
  updateTimeEvolutionAvailability();

  const irradiationDescription = data.irradiationLevels.size
    ? `με ${[...data.irradiationLevels].join(" και ")}`
    : "χωρίς ακτινοβόληση";
  return `${data.name}, ${irradiationDescription}.`;
}

function setMicroscopeView(isVisible) {
  const currentSampleData = getMicroscopeSampleData();

  if (!isVisible && currentSampleData?.timeEvolutionStatus === "running") {
    dragStatus.textContent =
      "Περίμενε να ολοκληρωθεί η πεντάδευτερη εξέλιξη των κυττάρων.";
    return;
  }

  const microscopeDescription = isVisible ? updateMicroscopeSpecimen() : "";

  stage.classList.toggle("simulation__stage--microscope-view", isVisible);
  if (!isVisible) {
    hideMicroscopeCellTooltip();
    if (!dnaModal.hidden) {
      closeDnaModal();
    }
  }
  microscopeScene.setAttribute("aria-hidden", String(!isVisible));
  dragStatus.textContent = isVisible
    ? `Προβολή μέσα από το μικροσκόπιο. ${microscopeDescription}`
    : "Επιστροφή στο εργαστήριο.";

  if (isVisible) {
    microscopeBack.focus();
  } else {
    microscopeHotspot.focus();
  }
}

microscopeHotspot.addEventListener("click", () => setMicroscopeView(true));
microscopeBack.addEventListener("click", () => setMicroscopeView(false));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!dnaModal.hidden) {
    closeDnaModal();
  } else if (stage.classList.contains("simulation__stage--microscope-view")) {
    setMicroscopeView(false);
  }
});

radiationHotspot.addEventListener("click", () => {
  const doorIsOpen = stage.classList.toggle("simulation__stage--door-open");

  if (doorIsOpen && irradiationLightTimer !== null) {
    window.clearTimeout(irradiationLightTimer);
    irradiationLightTimer = null;
    irradiationController.classList.remove("irradiation-controller--active");
    stage.classList.remove("simulation__stage--irradiating");
    irradiationControllerPower.setAttribute("aria-pressed", "false");
    radiationHotspot.disabled = false;
    radiationHotspot.setAttribute("aria-disabled", "false");
  }

  radiationHotspot.setAttribute("aria-pressed", String(doorIsOpen));
  radiationHotspot.setAttribute(
    "aria-label",
    doorIsOpen
      ? "Κλείσιμο πόρτας πηγής ακτινοβολίας"
      : "Άνοιγμα πόρτας πηγής ακτινοβολίας",
  );
  radiationHint.textContent = doorIsOpen
    ? "Κάνε κλικ για να κλείσεις την πόρτα."
    : "Κάνε κλικ για να ανοίξεις την πόρτα.";
});

irradiationControllerSwitch.addEventListener("click", () => {
  const nextLevel = irradiationController.dataset.level === "low" ? "high" : "low";
  const nextLevelLabel = nextLevel === "low" ? "Low" : "High";
  const followingLevelLabel = nextLevel === "low" ? "High" : "Low";

  irradiationController.dataset.level = nextLevel;
  irradiationControllerImage.src = irradiationControllerImages[nextLevel];
  irradiationControllerImage.alt =
    `Χειριστήριο μηχανήματος ακτινοβόλησης σε ένταση ${nextLevelLabel}`;
  irradiationControllerSwitch.setAttribute(
    "aria-pressed",
    String(nextLevel === "high"),
  );
  irradiationControllerSwitch.setAttribute(
    "aria-label",
    `Αλλαγή έντασης ακτινοβόλησης σε ${followingLevelLabel}`,
  );
});

irradiationControllerPower.addEventListener("click", () => {
  window.clearTimeout(irradiationLightTimer);
  irradiationController.classList.remove("irradiation-controller--active");
  stage.classList.remove("simulation__stage--irradiating");

  const irradiationLevel = irradiationController.dataset.level;
  const irradiatedSample = samples.find(
    (sample) => sample.dataset.location === "radiation",
  );
  radiationSourceIrradiation.src = irradiationEffectImages[irradiationLevel];
  radiationSourceIrradiation.dataset.level = irradiationLevel;

  // Επανεκκινεί το τρίδευτερο animation ακόμη και σε διαδοχικά πατήματα.
  void radiationSourceIrradiation.offsetWidth;

  irradiationController.classList.add("irradiation-controller--active");
  stage.classList.add("simulation__stage--irradiating");
  irradiationControllerPower.setAttribute("aria-pressed", "true");
  radiationHotspot.disabled = true;
  radiationHotspot.setAttribute("aria-disabled", "true");
  dragStatus.textContent =
    `Η ακτινοβόληση ${irradiationLevel === "low" ? "Low" : "High"} ενεργοποιήθηκε για 3 δευτερόλεπτα.`;

  irradiationLightTimer = window.setTimeout(() => {
    if (irradiatedSample) {
      const data = sampleData.get(irradiatedSample);
      data.irradiationLevels.add(irradiationLevel);
      irradiatedSample.dataset.irradiation =
        data.irradiationLevels.size === 2
          ? "low-high"
          : [...data.irradiationLevels][0];
      updateSampleIrradiationLabel(irradiatedSample);
    }

    irradiationController.classList.remove("irradiation-controller--active");
    stage.classList.remove("simulation__stage--irradiating");
    irradiationControllerPower.setAttribute("aria-pressed", "false");
    radiationHotspot.disabled = false;
    radiationHotspot.setAttribute("aria-disabled", "false");
    dragStatus.textContent = "Η ακτινοβόληση ολοκληρώθηκε.";
    irradiationLightTimer = null;
  }, 3000);
});

function setSamplePosition(sample, location) {
  const data = sampleData.get(sample);
  const position = location === "home" ? data.home : locations[location];

  sample.style.left = `${position.left}%`;
  sample.style.top = `${position.top}%`;
  sample.dataset.location = location;
  sample.querySelector("img").src =
    location === "home" ? sampleImages.default : sampleImages.horizontal;
  setSampleLabelPosition(sample, position);
  updateMicroscopeSpecimen();
}

function updateSampleIrradiationLabel(sample) {
  const data = sampleData.get(sample);
  const label = document.querySelector(`.scene-label--sample-${data.id}`);
  const irradiationLabel = label.querySelector(".scene-label__irradiation");
  const irradiationLines = [];

  if (data.irradiationLevels.has("low")) {
    irradiationLines.push("Χαμηλής Ενέργειας");
  }

  if (data.irradiationLevels.has("high")) {
    irradiationLines.push("Υψηλής Ενέργειας");
  }

  irradiationLabel.textContent = irradiationLines.length
    ? `Ακτινοβολημένο με Η/Μ ακτινοβολία:\n${irradiationLines.join("\n")}`
    : "";
}

function setSampleLabelPosition(sample, position) {
  const data = sampleData.get(sample);
  const label = document.querySelector(`.scene-label--sample-${data.id}`);

  label.style.left = `${position.left + sampleWidthPercent / 2}%`;
  label.style.top = `${position.top}%`;
  label.dataset.location = sample.dataset.location;
}

function positionSampleLabel(sample) {
  const data = sampleData.get(sample);
  const label = document.querySelector(`.scene-label--sample-${data.id}`);
  const stageRect = stage.getBoundingClientRect();
  const sampleRect = sample.getBoundingClientRect();

  label.style.left = `${sampleRect.left - stageRect.left + sampleRect.width / 2}px`;
  label.style.top = `${sampleRect.top - stageRect.top}px`;
  label.dataset.location = sample.dataset.location;
}

function occupiedByAnother(location, activeSample) {
  return samples.some(
    (sample) => sample !== activeSample && sample.dataset.location === location,
  );
}

function showAvailableZones(sample) {
  const data = sampleData.get(sample);

  dropZones.home.style.setProperty("--home-left", `${data.home.left}%`);
  dropZones.home.style.setProperty("--home-top", `${data.home.top}%`);
  dropZones.home.classList.add("is-available");
  dropZones.microscope.classList.toggle(
    "is-available",
    !occupiedByAnother("microscope", sample),
  );
  dropZones.radiation.classList.toggle(
    "is-available",
    stage.classList.contains("simulation__stage--door-open") &&
      !occupiedByAnother("radiation", sample),
  );
  stage.classList.add("simulation__stage--dragging");
}

function hideDropZones() {
  stage.classList.remove("simulation__stage--dragging");
  Object.values(dropZones).forEach((zone) => zone.classList.remove("is-available"));
}

function moveDraggedSample(event) {
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const sampleRect = drag.sample.getBoundingClientRect();
  const left = Math.min(
    stageRect.width - sampleRect.width,
    Math.max(0, event.clientX - stageRect.left - drag.offsetX),
  );
  const top = Math.min(
    stageRect.height - sampleRect.height,
    Math.max(0, event.clientY - stageRect.top - drag.offsetY),
  );

  drag.sample.style.left = `${left}px`;
  drag.sample.style.top = `${top}px`;
  positionSampleLabel(drag.sample);
}

function isNearZone(sample, zone) {
  if (!zone.classList.contains("is-available")) {
    return false;
  }

  const sampleRect = sample.getBoundingClientRect();
  const zoneRect = zone.getBoundingClientRect();
  const centerX = sampleRect.left + sampleRect.width / 2;
  const centerY = sampleRect.top + sampleRect.height / 2;
  const toleranceX = zoneRect.width * 0.45;
  const toleranceY = zoneRect.height * 0.6;

  return (
    centerX >= zoneRect.left - toleranceX &&
    centerX <= zoneRect.right + toleranceX &&
    centerY >= zoneRect.top - toleranceY &&
    centerY <= zoneRect.bottom + toleranceY
  );
}

function finishDrag(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }

  const { sample } = drag;
  const data = sampleData.get(sample);
  let destination = "home";

  if (!cancelled) {
    if (isNearZone(sample, dropZones.microscope)) {
      destination = "microscope";
    } else if (isNearZone(sample, dropZones.radiation)) {
      destination = "radiation";
    } else if (isNearZone(sample, dropZones.home)) {
      destination = "home";
    }
  } else {
    destination = drag.startLocation;
  }

  sample.classList.remove("is-dragging");
  sample.setAttribute("aria-grabbed", "false");
  hideDropZones();
  setSamplePosition(sample, destination);

  dragStatus.textContent =
    destination === "home"
      ? `${data.name} στην αρχική θέση.`
      : `${data.name} τοποθετήθηκε ${locations[destination].name}.`;
  drag = null;
}

samples.forEach((sample) => {
  sample.setAttribute("aria-grabbed", "false");
  sample.dataset.irradiation = "none";
  setSamplePosition(sample, "home");

  sample.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) {
      return;
    }

    event.preventDefault();
    sample.querySelector("img").src = sampleImages.default;
    const sampleRect = sample.getBoundingClientRect();
    drag = {
      sample,
      pointerId: event.pointerId,
      startLocation: sample.dataset.location,
      offsetX: event.clientX - sampleRect.left,
      offsetY: event.clientY - sampleRect.top,
    };

    try {
      sample.setPointerCapture(event.pointerId);
    } catch {
      // Η μεταφορά συνεχίζει και σε περιβάλλοντα χωρίς pointer capture.
    }
    sample.classList.add("is-dragging");
    sample.setAttribute("aria-grabbed", "true");
    showAvailableZones(sample);
  });

});

window.addEventListener("pointermove", moveDraggedSample);
window.addEventListener("pointerup", (event) => finishDrag(event));
window.addEventListener("pointercancel", (event) => finishDrag(event, true));

window.addEventListener("resize", () => {
  samples.forEach(positionSampleLabel);
});

window.addEventListener(
  "load",
  () => {
    samples.forEach(positionSampleLabel);
  },
  { once: true },
);
