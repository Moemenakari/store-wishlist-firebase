import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, useEmulators } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

let products = [];
let wishlist = new Map();
let user = null;
let stopWishlist = null;

// --- Catalogue: public, updates live when the admin changes a product ---------------
onSnapshot(query(collection(db, 'products'), orderBy('name')), (snapshot) => {
  products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderProducts();
});

// --- Auth ---------------------------------------------------------------------------
onAuthStateChanged(auth, (current) => {
  user = current;
  stopWishlist?.();
  wishlist = new Map();

  $('auth-form').hidden = Boolean(user);
  $('account').hidden = !user;
  $('account-email').textContent = user ? user.email ?? 'Guest' : '';

  if (user) {
    const items = query(collection(db, 'users', user.uid, 'wishlist'), orderBy('addedAt', 'desc'));
    stopWishlist = onSnapshot(items, (snapshot) => {
      wishlist = new Map(snapshot.docs.map((d) => [d.id, d.data()]));
      renderProducts();
      renderWishlist();
    });
  }
  renderProducts();
  renderWishlist();
});

$('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('email').value.trim();
  const password = $('password').value;
  $('auth-error').textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (signInError) {
    // No account yet: create one with the same details.
    if (!['auth/user-not-found', 'auth/invalid-credential'].includes(signInError.code)) {
      $('auth-error').textContent = readable(signInError);
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (registerError) {
      $('auth-error').textContent =
        registerError.code === 'auth/email-already-in-use' ? 'Wrong password for this email.' : readable(registerError);
    }
  }
});

$('guest').addEventListener('click', () => signInAnonymously(auth).catch((e) => ($('auth-error').textContent = readable(e))));
$('sign-out').addEventListener('click', () => signOut(auth));

// --- Wishlist actions ---------------------------------------------------------------
const itemRef = (productId) => doc(db, 'users', user.uid, 'wishlist', productId);

function toggle(product) {
  if (!user) {
    $('email').focus();
    return;
  }
  return wishlist.has(product.id)
    ? deleteDoc(itemRef(product.id))
    : setDoc(itemRef(product.id), { name: product.name, price: product.price, note: '', addedAt: serverTimestamp() });
}

// --- Rendering (textContent only, so user notes can never inject HTML) ---------------
function element(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function renderProducts() {
  $('products').replaceChildren(
    ...products.map((product) => {
      const saved = wishlist.has(product.id);
      const button = element('button', {
        type: 'button',
        textContent: saved ? '♥ Saved' : '♡ Add to wishlist',
        className: saved ? 'saved' : '',
      });
      button.setAttribute('aria-pressed', String(saved));
      button.addEventListener('click', () => toggle(product));
      return element('li', { className: 'product' }, [
        element('strong', { textContent: product.name }),
        element('small', { textContent: product.category }),
        element('span', { className: 'price', textContent: money.format(product.price) }),
        button,
      ]);
    }),
  );
}

function renderWishlist() {
  const list = $('wishlist');
  $('count').textContent = wishlist.size ? String(wishlist.size) : '';
  $('total').textContent = '';

  if (!user) {
    list.replaceChildren();
    return;
  }
  if (wishlist.size === 0) {
    list.replaceChildren(element('li', { className: 'empty', textContent: 'Nothing saved yet. Tap ♡ on a product.' }));
    return;
  }

  // Keep the note the user is typing when a live update re-renders the list.
  const focusedId = document.activeElement?.dataset?.productId;

  list.replaceChildren(
    ...[...wishlist].map(([productId, item]) => {
      const note = element('input', { value: item.note, placeholder: 'Add a note…', maxLength: 140 });
      note.dataset.productId = productId;
      note.setAttribute('aria-label', `Note for ${item.name}`);
      note.addEventListener('change', () => updateDoc(itemRef(productId), { note: note.value }));

      const remove = element('button', { type: 'button', className: 'link', textContent: 'Remove' });
      remove.addEventListener('click', () => deleteDoc(itemRef(productId)));

      return element('li', {}, [
        element('div', { className: 'row' }, [
          element('strong', { textContent: item.name }),
          element('span', { textContent: money.format(item.price) }),
        ]),
        note,
        element('div', { className: 'row' }, [element('span'), remove]),
      ]);
    }),
  );

  if (focusedId) list.querySelector(`[data-product-id="${CSS.escape(focusedId)}"]`)?.focus();

  const total = [...wishlist.values()].reduce((sum, item) => sum + item.price, 0);
  $('total').textContent = `Total: ${money.format(total)}`;
}

function readable(error) {
  return (error.code ?? error.message).replace('auth/', '').replaceAll('-', ' ');
}
