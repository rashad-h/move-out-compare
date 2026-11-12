import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const get = id => document.getElementById(id);
const onReviewPage = () => /^#(?:checkout-review|checkout-report|review-bin|review-chairs)$/.test(location.hash);
function syncPage() {
  const review = onReviewPage();
  const capture = location.hash === '#checkout-capture';
  document.body.classList.toggle('review-active', review);
  document.body.classList.toggle('capture-active', capture);
  document.querySelector('main').classList.toggle('checkout-page', review);
  document.querySelector('main').classList.toggle('capture-page', capture);
  document.querySelector('main').classList.toggle('report-page', location.hash === '#checkout-report');
  get('room-link').setAttribute('aria-current', review || capture ? 'false' : 'page');
  get('checkout-link').setAttribute('aria-current', review || capture ? 'page' : 'false');
  if (['#checkout-capture', '#checkout-review', '#checkout-report', '#room'].includes(location.hash)) window.scrollTo(0, 0);
}
syncPage();
window.addEventListener('hashchange', syncPage);
const labels = ['Entrance toward rear wall', 'Entrance and glazing', 'Rear pier and plant', 'Rear wall toward entrance'];
const { views, photos, model } = window.roomData;
let selected = 0;
let cameraMode = false;
let walking = false;
let showView = () => {};

const thumbnails = views.map((view, index) => {
  const button = document.createElement('button');
  button.className = 'thumb';
  button.setAttribute('aria-label', labels[index]);
  const image = new Image();
  image.alt = '';
  image.src = photos[index];
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  button.append(image, number);
  button.onclick = () => select(index);
  get('thumbs').append(button);
  return button;
});

function select(index) {
  selected = index;
  thumbnails.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  get('hero').hidden = get('enlarge').hidden = index === null;
  if (index === null) {
    get('hero').removeAttribute('src');
    get('hero').alt = '';
    get('name').textContent = 'No photo selected';
    get('description').textContent = 'Choose a photo to see its viewpoint.';
    return;
  }
  get('hero').src = photos[index];
  get('hero').alt = labels[index];
  get('name').textContent = views[index].photo.replace(/\.jpeg$/i, '');
  get('description').textContent = labels[index];
  showView();
}

get('enlarge').onclick = () => {
  get('full').src = photos[selected];
  get('full').alt = labels[selected];
  get('photo-dialog').showModal();
};
select(0);

const inventory = [
  { id: 'table', name: 'Oak table', expected: 1, value: 380 },
  { id: 'chairs', name: 'Upholstered chairs', expected: 4, value: 145 },
  { id: 'artwork', name: 'Framed prints', expected: 2, prints: [
    { name: 'Entrance framed print', value: 65 },
    { name: 'Rear framed print', value: 95 },
  ] },
  { id: 'bin', name: 'Waste bin', expected: 1, value: 24 },
];
const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const formatRange = (low, high) => low === high ? pounds.format(low) : `${pounds.format(low)}–${pounds.format(high)}`;
const catalog = Object.fromEntries(inventory.map(item => [item.id, item]));
for (const item of inventory) {
  for (const entry of item.prints ?? [item]) {
    const line = document.createElement('li');
    line.textContent = `${entry.name} · ${pounds.format(entry.value)}${item.id === 'chairs' ? ' per chair' : ''}`;
    get('valuation-list').append(line);
  }
}
const checkinDetails = [
  { item: catalog.table, photo: 0, centre: [49, 68], zoom: 2.4, note: 'Oak tabletop and pedestal visible. Fine surface wear is unverified.' },
  { item: catalog.chairs, photo: 0, centre: [18, 81], zoom: 3, note: 'Brown upholstered chairs with timber frames. The reference does not establish individual wear.' },
  { item: catalog.artwork.prints[0], photo: 3, centre: [77, 47], zoom: 3.1, note: 'Abstract print in a dark frame, mounted near the entrance.' },
  { item: catalog.artwork.prints[1], photo: 0, centre: [26, 40], zoom: 3.6, note: 'Abstract print in a dark frame, mounted toward the rear wall.' },
  { item: catalog.bin, photo: 1, centre: [54, 82], zoom: 3.7, note: 'Waste bin visible by the entrance glazing. Interior condition is unverified.' },
];
get('checkin-count').textContent = `${inventory.reduce((sum, item) => sum + item.expected, 0)} items recorded`;
for (const { item, photo, centre, zoom, note } of checkinDetails) {
  const card = document.createElement('article');
  card.className = 'asset-card';
  card.innerHTML = '<div class="asset-image"><img alt=""></div><div class="asset-body"><h3></h3><div class="asset-meta"><strong></strong><span></span></div><p></p><button class="asset-source" type="button"></button></div>';
  const preview = card.querySelector('img');
  preview.src = photos[photo];
  preview.style.width = `${zoom * 100}%`;
  preview.style.transform = `translate(-${centre[0]}%, -${centre[1]}%)`;
  card.querySelector('h3').textContent = item.name;
  card.querySelector('strong').textContent = `${item.expected ?? 1} recorded`;
  card.querySelector('.asset-meta span').textContent = `${pounds.format(item.value)} sample${item.expected > 1 ? ' each' : ''}`;
  card.querySelector('p').textContent = note;
  const source = card.querySelector('button');
  source.textContent = `View ${views[photo].photo}`;
  source.onclick = () => {
    get('full').src = photos[photo];
    get('full').alt = `Original check-in photo for ${item.name}`;
    get('photo-dialog').showModal();
  };
  get('checkin-inventory-list').append(card);
}
const inventoryKey = 'move-out-compare:meeting-room:checkout-v2';
let savedCounts = { bin: 0, chairs: 3, table: 1, artwork: 2 };
try {
  const current = localStorage.getItem(inventoryKey);
  const legacy = current === null ? JSON.parse(localStorage.getItem('move-out-compare:meeting-room:checkout-v1') ?? '{}') : null;
  const saved = current === null
    ? Object.fromEntries(Object.entries(legacy ?? {}).filter(([, count]) => Number.isInteger(count)))
    : JSON.parse(current);
  if (saved && typeof saved === 'object') savedCounts = { ...savedCounts, ...saved };
} catch {
  // The checklist remains usable if browser storage is unavailable.
}
const inventoryRows = inventory.map(({ id, name, expected }) => {
  const row = document.createElement('label');
  row.className = 'inventory-row';
  const title = document.createElement('span');
  title.textContent = `${name} · ${expected} at move-in`;
  const count = document.createElement('select');
  count.setAttribute('aria-label', `${name} present at checkout`);
  count.add(new Option('Not checked', ''));
  for (let present = 0; present <= expected; present++) count.add(new Option(`${present} present`, String(present)));
  const saved = savedCounts[id];
  if (Number.isInteger(saved) && saved >= 0 && saved <= expected) count.value = String(saved);
  const status = document.createElement('span');
  row.append(title, count, status);
  get('inventory-list').append(row);
  count.addEventListener('change', updateInventory);
  return { id, count, status, expected };
});
const demoPhotos = window.roomData.checkoutPhotos;
let checkoutPhotos = demoPhotos;
const findings = {
  bin: { title: 'Waste bin', before: 1, after: 0, note: 'The spot beside the entrance glazing appears empty at checkout.' },
  chairs: { title: 'Upholstered chair', before: 0, after: 1, note: 'The chair nearest the entrance on the artwork side appears absent.' },
};
let showReviewedItem = () => {};

function updateInventory() {
  const counts = {};
  let missing = 0;
  let unchecked = 0;
  for (const { id, count, status, expected } of inventoryRows) {
    if (count.value === '') {
      counts[id] = null;
      unchecked++;
      status.textContent = 'Pending check';
      status.classList.remove('missing');
      continue;
    }
    counts[id] = Number(count.value);
    const shortfall = expected - counts[id];
    missing += shortfall;
    status.textContent = shortfall ? `${shortfall} missing · review` : 'Accounted for';
    status.classList.toggle('missing', shortfall > 0);
  }
  get('inventory-summary').textContent = `${missing} flagged missing · ${unchecked} inventory lines unchecked`;
  updateCheckoutReport(counts, unchecked, missing);
  try { localStorage.setItem(inventoryKey, JSON.stringify(counts)); } catch { /* Storage can be blocked for local files. */ }
}

function updateCheckoutReport(counts, unchecked, missingCount) {
  const lines = get('report-lines');
  lines.replaceChildren();
  let totalLow = 0;
  let totalHigh = 0;
  let accountedFor = 0;
  const valuation = [];
  const missingItems = [];
  const evidenceNotes = [];
  const evidence = get('report-evidence');
  evidence.replaceChildren();
  for (const { id, name, expected, value, prints } of inventory) {
    const present = counts[id];
    const missing = present === null ? 0 : expected - present;
    accountedFor += present ?? 0;
    const bothPrints = prints && missing === prints.length;
    const low = !missing ? 0 : prints ? bothPrints ? prints[0].value + prints[1].value : prints[0].value : missing * value;
    const high = missing && prints && !bothPrints ? prints[1].value : low;
    totalLow += low;
    totalHigh += high;
    const row = lines.insertRow();
    const label = row.insertCell();
    const detail = missing > 0 && findings[id];
    const title = document.createElement(detail ? 'a' : 'span');
    if (detail) title.href = '#review-' + id;
    title.textContent = name;
    label.append(title);
    row.insertCell().textContent = String(expected);
    row.insertCell().textContent = present === null ? 'Unchecked' : String(present);
    const state = row.insertCell();
    state.textContent = missing ? `${missing} missing` : present === null ? 'Pending check' : 'Accounted for';
    state.classList.toggle('missing-value', missing > 0);
    row.insertCell().textContent = missing ? formatRange(low, high) : '—';
    if (missing) valuation.push(`${missing} × ${prints ? formatRange(low / missing, high / missing) : pounds.format(value)} (${detail?.title ?? name})`);
    if (missing) {
      const label = missing === 1 && id === 'artwork' ? 'framed print'
        : missing > 1 ? name.toLowerCase() : (detail?.title ?? name).toLowerCase();
      missingItems.push(`${missing} ${label}`);
    }
    if (detail) {
      evidenceNotes.push(detail.note);
      const card = document.createElement('article');
      card.className = 'finding';
      card.innerHTML = '<h4></h4><div class="comparison"><figure><img><figcaption>Check-in</figcaption></figure><figure><img><figcaption>Checkout</figcaption></figure></div><p></p><a>View in 3D</a>';
      card.querySelector('h4').textContent = detail.title;
      const [before, after] = card.querySelectorAll('img');
      before.src = photos[detail.before];
      before.alt = `Check-in evidence for ${detail.title}`;
      after.src = checkoutPhotos[detail.after];
      after.alt = `Checkout evidence for ${detail.title}`;
      card.querySelector('p').textContent = detail.note;
      const link = card.querySelector('a');
      link.href = '#review-' + id;
      link.onclick = () => window.addEventListener('hashchange', () => showReviewedItem(id), { once: true });
      evidence.append(card);
    }
  }
  if (!evidence.children.length) evidence.textContent = 'No comparison photos for the current missing items.';
  get('report-total').textContent = formatRange(totalLow, totalHigh);
  get('report-missing').textContent = missingCount;
  const checkinTotal = inventory.reduce((sum, item) => sum + item.expected, 0);
  get('report-accounted').textContent = `${accountedFor} of ${checkinTotal}`;
  get('report-equation').textContent = valuation.join(' + ');
  const findingSummary = missingItems.length
    ? `The checkout flags ${new Intl.ListFormat('en-GB').format(missingItems)} as missing, with a combined sample replacement value of ${formatRange(totalLow, totalHigh)}.`
    : 'The checkout has no items flagged as missing.';
  const reviewSummary = unchecked
    ? `${unchecked} inventory ${unchecked === 1 ? 'line still needs' : 'lines still need'} checking before the review is complete.`
    : 'The case is awaiting a reviewer decision.';
  get('report-summary').textContent = `The checkout review compares the meeting room’s check-in inventory with three checkout photographs. It accounts for ${accountedFor} of the ${checkinTotal} items recorded at check-in. ${findingSummary} ${reviewSummary}`;
  get('report-summary-evidence').textContent = [
    ...evidenceNotes,
    evidenceNotes.length ? 'The before-and-after pairs below show the relevant locations.' : '',
    'The oak table and framed prints use sample verification entries in this demo. The replacement figures are illustrative and remain separate from the deposit decision.',
  ].filter(Boolean).join(' ');
  get('report-coverage').textContent = unchecked
    ? `${unchecked} inventory lines still unchecked. Values and sample verification entries are demo data.`
    : 'All inventory lines checked. Table and print verification and all prices are demo data.';
}
updateInventory();

for (const id of ['bin', 'chairs']) {
  const bin = id === 'bin';
  const row = inventoryRows.find(item => item.id === id);
  const card = get('review-card-template').content.firstElementChild.cloneNode(true);
  card.id = 'review-' + id;
  card.querySelector('h3').textContent = bin ? 'Waste bin' : 'Upholstered chairs';
  card.querySelector('.before').src = photos[bin ? 1 : 0];
  const comparison = card.querySelector('.review-comparison');
  comparison.addEventListener('toggle', () => {
    card.querySelector('.review-comparison-label').textContent = comparison.open ? 'Hide before and after' : 'View before and after';
  });
  card.querySelector('.after').src = checkoutPhotos[bin ? 0 : 1];
  card.querySelector('.after').dataset.checkoutPhoto = bin ? '0' : '1';
  card.querySelector('.review-note').textContent = bin
    ? 'The bin’s usual spot by the entrance glazing appears empty.'
    : 'The chair nearest the entrance on the artwork side appears absent.';
  if (!bin) {
    card.querySelector('.review-extra').hidden = false;
    card.querySelector('.review-extra img').src = checkoutPhotos[2];
    card.querySelector('.review-extra img').dataset.checkoutPhoto = '2';
  }
  const result = card.querySelector('.review-result');
  const confirm = card.querySelector('.review-confirm');
  const sync = () => {
    const missing = row.count.value === String(row.expected - 1);
    result.textContent = missing ? '1 missing' : 'Pending review';
    result.classList.toggle('missing', missing);
    confirm.disabled = missing;
  };
  row.count.addEventListener('change', sync);
  card.querySelector('.review-model').onclick = () => showReviewedItem(id);
  card.querySelector('.review-retake').onclick = () => {
    row.count.value = '';
    row.count.dispatchEvent(new Event('change'));
    result.textContent = bin ? 'Retake needed. Include the full entrance corner.' : 'Retake needed. Include all sides of the table.';
  };
  confirm.onclick = () => {
    row.count.value = String(row.expected - 1);
    row.count.dispatchEvent(new Event('change'));
  };
  sync();
  get('review-grid').append(card);
}

function openLinkedComparison() {
  const id = location.hash.slice(1);
  if (id === 'review-bin' || id === 'review-chairs') get(id).querySelector('.review-comparison').open = true;
}
window.addEventListener('hashchange', openLinkedComparison);
openLinkedComparison();

const captureGuides = [
  { title: 'Toward the entrance', instruction: 'Stand near the rear wall. Aim at the doorway, glazing and bin corner.', position: [-.3, 1.8, -1.6], target: [-.14, 1.48, 1.55] },
  { title: 'From the entrance', instruction: 'Stand just inside the doorway. Aim down the room to include the table and both sides.', position: [.58, 1.72, 1.75], target: [-.08, 1.28, -.90] },
  { title: 'Along the artwork wall', instruction: 'Stand on the artwork side near the entrance. Aim diagonally across the table.', position: [-.90, 1.65, 1.10], target: [.31, 1.22, -.85] },
];
let processingTimer = null;
let captureAngle = 0;
let updateCaptureMarkers = () => {};
const captureSlots = captureGuides.map(({ title, instruction }, index) => {
  const slot = document.createElement('article');
  slot.className = 'capture-slot';
  slot.innerHTML = '<h3><button type="button" class="capture-guide"></button></h3><p></p><img hidden><p class="capture-file"></p>';
  const guide = slot.querySelector('button');
  guide.textContent = `${index + 1}. ${title}`;
  guide.onclick = () => chooseCaptureAngle(index);
  slot.querySelector('p').textContent = instruction;
  const preview = slot.querySelector('img');
  const filename = slot.querySelector('.capture-file');
  get('capture-grid').append(slot);
  return { guide, preview, filename, url: null };
});

function chooseCaptureAngle(index) {
  captureAngle = index;
  captureSlots.forEach(({ guide }, i) => guide.setAttribute('aria-pressed', String(i === index)));
  updateCaptureMarkers();
}
chooseCaptureAngle(0);

const captureFiles = get('capture-files');
let uploadRevision = 0;
function displayCapturePhotos(urls, names) {
  captureSlots.forEach((slot, index) => {
    slot.url = urls[index];
    slot.preview.src = slot.url;
    slot.preview.hidden = false;
    slot.preview.alt = `Checkout photo for ${captureGuides[index].title}`;
    slot.filename.textContent = names[index];
  });
  syncCapture();
}
captureFiles.onchange = async () => {
  const revision = ++uploadRevision;
  const files = Array.from(captureFiles.files).sort((a, b) => a.name < b.name ? -1 : Number(a.name > b.name));
  const error = get('capture-error');
  error.textContent = '';
  if (files.length !== captureSlots.length) {
    error.textContent = 'Choose exactly three photos together.';
    captureFiles.value = '';
    return;
  }
  const urls = files.map(file => URL.createObjectURL(file));
  get('capture-generate').disabled = true;
  try {
    await Promise.all(urls.map(url => {
      const image = new Image();
      image.src = url;
      return image.decode();
    }));
    if (revision !== uploadRevision) {
      urls.forEach(url => URL.revokeObjectURL(url));
      return;
    }
    displayCapturePhotos(urls, files.map(file => file.name));
  } catch {
    urls.forEach(url => URL.revokeObjectURL(url));
    if (revision !== uploadRevision) return;
    error.textContent = 'At least one photo could not be opened. Choose three JPEG, PNG, or WebP files.';
    captureFiles.value = '';
    syncCapture();
  }
};

function syncCapture() {
  const ready = captureSlots.filter(slot => slot.url).length;
  const busy = processingTimer !== null;
  get('capture-generate').disabled = busy || ready !== captureSlots.length;
  get('capture-sample').disabled = busy;
  captureFiles.disabled = busy;
  get('capture-spinner').hidden = !busy;
  get('capture-status').textContent = busy
    ? 'Preparing checkout review…'
    : `${ready} of ${captureSlots.length} photos ready`;
}

get('capture-sample').onclick = () => {
  uploadRevision++;
  captureFiles.value = '';
  get('capture-error').textContent = '';
  displayCapturePhotos(demoPhotos, captureGuides.map(() => 'Demo photo loaded'));
};
get('capture-generate').onclick = () => {
  const submitted = captureSlots.map(slot => slot.url);
  if (processingTimer !== null || submitted.some(url => !url)) return;
  processingTimer = window.setTimeout(() => {
    processingTimer = null;
    checkoutPhotos = submitted;
    document.querySelectorAll('[data-checkout-photo]').forEach(img => {
      img.src = checkoutPhotos[Number(img.dataset.checkoutPhoto)];
    });
    updateInventory();
    syncCapture();
    location.hash = '#checkout-review';
  }, 10000);
  syncCapture();
};
window.addEventListener('hashchange', () => {
  if (location.hash === '#checkout-capture' || processingTimer === null) return;
  window.clearTimeout(processingTimer);
  processingTimer = null;
  syncCapture();
});
syncCapture();

async function setup() {
  const stage = get('stage');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dce7ed');
  const camera = new THREE.PerspectiveCamera(43, 1, 0.025, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  stage.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = .12;
  controls.maxDistance = 15;
  const initialPosition = new THREE.Vector3(2.7, 3.1, 4.7);
  const initialTarget = new THREE.Vector3(-.77, .50, .8);
  const vector = coordinates => new THREE.Vector3(...coordinates);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let transition;
  const keys = new Set();
  const look = new THREE.Euler(0, 0, 0, 'YXZ');
  let dragPointer = null;
  let lastFrame;
  const walkKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  const canvas = renderer.domElement;
  const items = [
    { match: /^Waste bin/, name: 'Waste bin', status: 'Present at move-in', note: 'The bin is visible by the entrance glazing. The photo does not establish its interior condition.', photo: 1, crop: [.45, .75, .62, .90] },
    { match: /^Oak round table$|^Table rounded edge/, name: 'Oak table', status: 'Surface wear unverified', note: 'Part of the wood surface is visible. Fine scratches and the area under the items in the photo cannot be assessed from this angle.', crop: [.34, .65, .66, .76] },
    { match: /^Chair [1-4] upholstered seat$/, name: 'Upholstered chairs', status: 'Upholstery wear unverified', note: 'The photo shows the two chairs nearest the entrance. It does not establish the condition of each chair individually.', crop: [.06, .70, .30, .94] },
    { match: /^Charcoal picture frame$|^Rectified photographed abstract print$/, name: 'Wall artwork', status: 'Frame appears in place', note: 'The artwork is visible in the move-in photo. Fine scratches and fixings are unverified.', crop: [.20, .32, .33, .49] },
  ];
  const raycaster = new THREE.Raycaster();
  const aim = new THREE.Vector2();
  let highlighted = null;
  let inspected = null;
  const outline = new THREE.BoxHelper(new THREE.Object3D(), 0x19d5f5);
  outline.visible = false;
  scene.add(outline);
  const locked = () => document.pointerLockElement === canvas;
  let mouseLook = false;
  const aiming = () => locked() || mouseLook;

  function syncLookControls() {
    get('resume-look').textContent = aiming() ? 'Release mouse look' : 'Enable mouse look';
    get('aim').hidden = !walking || !aiming();
  }

  function requestLook() {
    mouseLook = true;
    syncLookControls();
    if (locked() || !canvas.requestPointerLock) return;
    try {
      canvas.requestPointerLock()?.catch(() => {});
    } catch {
      // Drag and arrow controls remain available.
    }
  }

  function inspect() {
    if (!highlighted) return;
    if (highlighted === inspected) {
      closeEvidence();
      return;
    }
    inspected = highlighted;
    const item = highlighted.userData.inspection;
    const [left, top, right, bottom] = item.crop;
    const crop = get('item-crop');
    const image = get('item-image');
    crop.style.aspectRatio = String(.75 * (right - left) / (bottom - top));
    image.style.width = `${100 / (right - left)}%`;
    image.style.left = `${-100 * left / (right - left)}%`;
    image.style.top = `${-100 * top / (bottom - top)}%`;
    const photo = item.photo ?? 0;
    image.src = photos[photo];
    image.alt = item.name + ' cropped from the original move-in photo';
    get('item-name').textContent = item.print?.name ?? item.name;
    get('item-status').textContent = item.status;
    get('item-note').textContent = item.note;
    const sampleValue = item.name === 'Oak table' ? catalog.table.value
      : item.name === 'Upholstered chairs' ? catalog.chairs.value
      : item.name === 'Waste bin' ? catalog.bin.value
      : item.print?.value;
    get('item-value').textContent = Number.isFinite(sampleValue)
      ? `Sample replacement value · ${pounds.format(sampleValue)}${item.name === 'Upholstered chairs' ? ' per chair' : ''}`
      : '';
    get('item-source').textContent = views[photo].photo + ' · original move-in photo crop';
    const reviewId = highlighted.userData.checkoutReview;
    const reviewLink = get('item-review');
    reviewLink.hidden = !reviewId;
    if (reviewId) reviewLink.href = '#review-' + reviewId;
    get('evidence').hidden = false;
  }

  function closeEvidence() {
    inspected = null;
    get('evidence').hidden = true;
    canvas.focus({ preventScroll: true });
  }
  get('close-evidence').onclick = closeEvidence;
  get('item-review').addEventListener('click', () => { closeEvidence(); outline.visible = false; });
  get('resume-look').onclick = () => {
    if (aiming()) {
      mouseLook = false;
      if (locked()) document.exitPointerLock();
      syncLookControls();
    } else {
      requestLook();
    }
  };
  get('exit-walk').onclick = () => setWalking(false);
  document.addEventListener('pointerlockchange', () => {
    mouseLook = false;
    syncLookControls();
    keys.clear();
  });
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D room. In walkthrough mode use WASD to move and arrow keys or drag to look.');

  window.addEventListener('keydown', event => {
    if (!walking || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Escape') {
      if (!get('evidence').hidden) closeEvidence();
      else if (!locked()) { setWalking(false); get('walkthrough').focus(); }
    } else if (event.code === 'KeyE' && inspected) {
      event.preventDefault();
      closeEvidence();
    } else if (event.code === 'Enter' && event.target === canvas && !event.repeat) {
      event.preventDefault();
      if (aiming() || !highlighted) updateHighlight(centre);
      inspect();
    } else if (walkKeys.includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', event => {
    if (!walking || aiming() || event.button !== 0 || dragPointer !== null) return;
    dragPointer = event.pointerId;
    canvas.setPointerCapture(dragPointer);
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (event.pointerId === dragPointer) dragPointer = null;
  });
  canvas.addEventListener('pointermove', event => {
    if (!walking || (!aiming() && event.pointerId !== dragPointer)) return;
    look.y -= event.movementX * .003;
    look.x = THREE.MathUtils.clamp(look.x - event.movementY * .003, -1.45, 1.45);
  });
  let clickStart;
  canvas.addEventListener('pointerdown', event => { clickStart = [event.clientX, event.clientY]; });
  canvas.addEventListener('click', event => {
    if (!walking && (!clickStart || Math.hypot(event.clientX - clickStart[0], event.clientY - clickStart[1]) > 5)) return;
    if (aiming()) updateHighlight(centre);
    else pointAt(event);
    inspect();
  });
  function pointAt(event) {
    const rect = canvas.getBoundingClientRect();
    aim.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
    updateHighlight(aim);
  }
  canvas.addEventListener('pointermove', event => {
    if (walking && !aiming() && dragPointer === null) pointAt(event);
  });
  canvas.addEventListener('pointerleave', () => {
    if (!aiming()) { highlighted = null; outline.visible = false; }
  });
  function updateHighlight(point) {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(point, camera);
    const hit = raycaster.intersectObject(room, true).find(({object}) => object.visible)?.object;
    highlighted = hit?.userData.inspection ? hit : null;
    outline.visible = Boolean(highlighted);
    if (highlighted) {
      outline.material.color.setHex(highlighted.material === missingHighlight ? 0xff2820 : 0x19d5f5);
      outline.setFromObject(highlighted);
    }
    get('status').textContent = highlighted ? highlighted.userData.inspection.name : 'Walkthrough';
  }
  const centre = new THREE.Vector2();

  scene.add(new THREE.HemisphereLight('#f1f8ff', '#a89982', 2.25));
  const key = new THREE.DirectionalLight('#fff3e1', 2.2);
  key.position.set(3, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#e0efff', 1.1);
  fill.position.set(-3, 4, -4);
  scene.add(fill);

  const bytes = Uint8Array.from(atob(model), char => char.charCodeAt(0));
  const room = (await new GLTFLoader().parseAsync(bytes.buffer, '')).scene;
  scene.add(room);
  const cutaway = [];
  const reviewMeshes = { bin: [], chairs: [] };
  const originalMaterials = new Map();
  const missingHighlight = new THREE.MeshStandardMaterial({color: 0xe12d24, emissive: 0x90160f, emissiveIntensity: .48});
  room.traverse(node => {
    if (['entrance', 'ceiling'].includes(node.userData.group)) cutaway.push(node);
    const name = node.userData.name ?? node.name;
    const item = items.find(candidate => candidate.match.test(name));
    if (node.isMesh && /^Waste bin/.test(name)) {
      reviewMeshes.bin.push(node);
      node.userData.checkoutReview = 'bin';
    }
    if (node.isMesh && /^Chair /.test(name)) {
      const centre = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      if (centre.x < 0 && centre.z > 0) {
        reviewMeshes.chairs.push(node);
        node.userData.checkoutReview = 'chairs';
        node.userData.inspection = items.find(candidate => candidate.name === 'Upholstered chairs');
      }
    }
    if (item && node.isMesh) {
      const nearEntrance = item.name === 'Wall artwork' && new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).z > 0;
      node.userData.inspection = item.name === 'Wall artwork'
        ? { ...item, print: catalog.artwork.prints[nearEntrance ? 0 : 1], crop: nearEntrance ? [0, .26, .14, .52] : item.crop }
        : item;
    }
  });

  const referenceCamera = new THREE.PerspectiveCamera(78, .75, .01, .65);
  const frustum = new THREE.CameraHelper(referenceCamera);
  frustum.setColors(0x08768d, 0x08768d, 0x08768d, 0x08768d, 0x08768d);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.085, 24, 16), new THREE.MeshBasicMaterial({ color: '#08768d', depthTest: false }));
  marker.renderOrder = 3;
  frustum.material.depthTest = false;
  frustum.renderOrder = 2;
  scene.add(frustum, marker);
  const capturePosition = new THREE.Vector3(.25, 5.6, 5.2);
  const captureTarget = new THREE.Vector3(0, .85, 0);
  const guideMarkers = captureGuides.map(({ position, target, title }, index) => {
    const viewpoint = new THREE.PerspectiveCamera(69, .75, .025, .75);
    viewpoint.position.set(...position);
    viewpoint.lookAt(...target);
    viewpoint.updateMatrixWorld();
    const cone = new THREE.CameraHelper(viewpoint);
    cone.material.depthTest = false;
    cone.renderOrder = 3;
    scene.add(cone);
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'capture-pin';
    pin.textContent = index + 1;
    pin.setAttribute('aria-label', `Camera ${index + 1}: ${title}`);
    pin.onclick = () => chooseCaptureAngle(index);
    pin.hidden = true;
    stage.append(pin);
    return { viewpoint, cone, pin };
  });
  const inCapture = () => location.hash === '#checkout-capture';
  updateCaptureMarkers = () => {
    const capture = inCapture();
    guideMarkers.forEach(({ cone, pin }, index) => {
      const active = index === captureAngle;
      cone.visible = capture && active;
      const colour = 0x16a4ad;
      cone.setColors(colour, colour, colour, colour, colour);
      pin.hidden = !capture;
      pin.setAttribute('aria-pressed', String(active));
    });
    if (capture) get('status').textContent = `Camera ${captureAngle + 1} · ${captureGuides[captureAngle].title}`;
  };
  const projectedPin = new THREE.Vector3();
  camera.position.copy(initialPosition);
  controls.target.copy(initialTarget);
  controls.update();

  showView = () => {
    const capture = inCapture();
    const view = capture || selected === null ? null : views[selected];
    const position = view ? vector(view.position) : initialPosition;
    const target = view ? vector(view.target) : initialTarget;
    referenceCamera.position.copy(position);
    referenceCamera.lookAt(target);
    referenceCamera.fov = view?.verticalFovDegrees ?? 78;
    referenceCamera.updateProjectionMatrix();
    referenceCamera.updateMatrixWorld();
    frustum.update();
    marker.position.copy(position);
    marker.visible = frustum.visible = !cameraMode && view !== null;
    cutaway.forEach(node => { node.visible = cameraMode; });
    get('overview').setAttribute('aria-pressed', String(!cameraMode));
    get('camera').setAttribute('aria-pressed', String(cameraMode));
    get('camera').disabled = view === null;
    get('status').textContent = cameraMode ? 'Estimated photo angle' : view ? `Camera ${selected + 1} · estimated position` : 'Room overview';
    const endPosition = capture ? capturePosition : cameraMode ? position : initialPosition;
    const endTarget = capture ? captureTarget : cameraMode ? target : initialTarget;
    if (capture) get('caption').textContent = 'Estimated camera positions and directions, based on the three original checkout photos.';
    updateCaptureMarkers();
    // Keep the pose's vertical angle, and widen the view if the canvas is portrait.
    camera.fov = cameraMode ? view.verticalFovDegrees : 43;
    camera.updateProjectionMatrix();
    if (reducedMotion) {
      camera.position.copy(endPosition);
      controls.target.copy(endTarget);
      controls.update();
      transition = null;
    } else {
      transition = { start: performance.now(), from: camera.position.clone(), lookFrom: controls.target.clone(), endPosition, endTarget };
    }
  };

  function refreshReviewColours() {
    for (const [id, meshes] of Object.entries(reviewMeshes)) {
      const { count, expected } = inventoryRows.find(row => row.id === id);
      const missing = onReviewPage() && count.value === String(expected - 1);
      for (const mesh of meshes) {
        if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material);
        mesh.material = missing ? missingHighlight : originalMaterials.get(mesh);
      }
    }
  }

  showReviewedItem = id => {
    setWalking(false);
    select(null);
    showView();
    transition = null;
    const target = id === 'bin' ? [-.94, .20, 1.63] : [-.77, .50, .8];
    camera.position.set(2.7, 3.1, 4.7);
    controls.target.set(...target);
    controls.update();
    refreshReviewColours();
    const { count, expected } = inventoryRows.find(row => row.id === id);
    const missing = count.value === String(expected - 1);
    get('status').textContent = `${id === 'bin' ? 'Waste bin' : 'Chair by the artwork wall'} · ${missing ? 'missing' : 'move-in location'}`;
    const bounds = stage.getBoundingClientRect();
    if (bounds.top < 65 || bounds.bottom > innerHeight) stage.scrollIntoView({ block: 'center' });
  };
  document.querySelectorAll('.review-model').forEach(button => { button.disabled = false; });
  inventoryRows.forEach(({count}) => count.addEventListener('change', () => refreshReviewColours()));
  refreshReviewColours();

  function setWalking(active) {
    walking = active;
    cameraMode = false;
    keys.clear();
    dragPointer = null;
    lastFrame = undefined;
    transition = null;
    controls.enabled = !active;
    document.querySelector('.layout').classList.toggle('walking', active);
    document.querySelector('.photos').hidden = active;
    get('walk-help').hidden = !active;
    get('evidence').hidden = true;
    inspected = null;
    mouseLook = false;
    syncLookControls();
    outline.visible = false;
    highlighted = null;
    get('walkthrough').setAttribute('aria-pressed', String(active));
    get('caption').textContent = active
      ? 'WASD to move. Drag or use the arrow keys to look. Esc to return to Overview.'
      : 'Camera positions and angles are estimated from the photos. Drag to orbit. Scroll or pinch to zoom.';
    if (!active) {
      if (locked()) document.exitPointerLock();
      if (document.fullscreenElement === stage) document.exitFullscreen().catch(() => {});
      showView();
      return;
    }
    select(null);
    get('overview').setAttribute('aria-pressed', 'false');
    get('camera').setAttribute('aria-pressed', 'false');
    get('camera').disabled = true;
    get('status').textContent = 'Walkthrough';
    marker.visible = frustum.visible = false;
    cutaway.forEach(node => { node.visible = true; });
    camera.position.set(0, 1.65, 1.58);
    look.set(-.48, 0, 0);
    camera.rotation.copy(look);
    camera.fov = 66;
    camera.updateProjectionMatrix();
    canvas.focus({ preventScroll: true });
  }

  get('overview').onclick = () => setWalking(false);
  get('camera').onclick = () => { cameraMode = true; showView(); };
  get('walkthrough').onclick = () => {
    setWalking(!walking);
    if (!walking) return;
    requestLook();
    stage.requestFullscreen?.().catch(() => {});
  };
  let previousScreen = onReviewPage() ? 'review' : inCapture() ? 'capture' : 'check-in';
  window.addEventListener('hashchange', () => {
    const screen = onReviewPage() ? 'review' : inCapture() ? 'capture' : 'check-in';
    if (screen === previousScreen) return;
    previousScreen = screen;
    select(null);
    setWalking(false);
    refreshReviewColours();
  });
  get('overview').disabled = get('camera').disabled = get('walkthrough').disabled = false;
  controls.addEventListener('start', () => { transition = null; });
  new ResizeObserver(() => {
    camera.aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
  }).observe(stage);
  renderer.setAnimationLoop(time => {
    if (walking) {
      const dt = lastFrame === undefined ? 0 : Math.min((time - lastFrame) / 1000, .05);
      lastFrame = time;
      const turn = Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'));
      const tilt = Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
      look.y += turn * dt * 1.6;
      look.x = THREE.MathUtils.clamp(look.x + tilt * dt * 1.6, -1.45, 1.45);
      camera.rotation.copy(look);
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const step = dt * 1.4 / Math.max(1, Math.hypot(forward, right));
      const sin = Math.sin(look.y);
      const cos = Math.cos(look.y);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x + (right * cos - forward * sin) * step, -1.10, 1.10);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + (-right * sin - forward * cos) * step, -1.80, 1.80);
      if (aiming()) updateHighlight(centre);
    } else if (transition) {
      const ratio = Math.min(1, Math.max(0, (time - transition.start) / 520));
      const ease = ratio * ratio * (3 - 2 * ratio);
      camera.position.lerpVectors(transition.from, transition.endPosition, ease);
      controls.target.lerpVectors(transition.lookFrom, transition.endTarget, ease);
      controls.update();
      if (ratio === 1) transition = null;
    }
    renderer.render(scene, camera);
    if (inCapture()) {
      for (const { viewpoint, pin } of guideMarkers) {
        projectedPin.copy(viewpoint.position).project(camera);
        pin.style.left = `${(projectedPin.x + 1) * 50}%`;
        pin.style.top = `${(1 - projectedPin.y) * 50}%`;
      }
    }
  });
  if (onReviewPage()) select(null);
  showView();
}

setup().catch(error => {
  console.error(error);
  get('status').textContent = 'Could not open the 3D model. Try Chrome with hardware acceleration enabled.';
});
