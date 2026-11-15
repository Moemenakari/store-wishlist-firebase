import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env;

const item = (overrides = {}) => ({
  name: 'Turkish Coffee 500g',
  price: 9.9,
  note: '',
  addedAt: serverTimestamp(),
  ...overrides,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cedar-market',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'products/coffee'), { name: 'Turkish Coffee 500g', category: 'Drinks', price: 9.9 });
    await setDoc(doc(db, 'users/lina/wishlist/coffee'), { name: 'Turkish Coffee 500g', price: 9.9, note: '', addedAt: new Date() });
  });
});

after(() => env.cleanup());

test('anyone can read the catalogue', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'products/coffee')));
});

test('nobody can write to the catalogue from the client', async () => {
  const db = env.authenticatedContext('lina').firestore();
  await assertFails(setDoc(doc(db, 'products/coffee'), { name: 'Free coffee', category: 'Drinks', price: 0 }));
});

test('a signed-in user can add a catalogue product to their own wishlist', async () => {
  const db = env.authenticatedContext('omar').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/omar/wishlist/coffee'), item()));
});

test('a signed-out visitor cannot use a wishlist', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'users/omar/wishlist/coffee'), item()));
});

test('a user cannot read or change another user\'s wishlist', async () => {
  const db = env.authenticatedContext('omar').firestore();
  await assertFails(getDoc(doc(db, 'users/lina/wishlist/coffee')));
  await assertFails(deleteDoc(doc(db, 'users/lina/wishlist/coffee')));
});

test('items must point to a real product', async () => {
  const db = env.authenticatedContext('omar').firestore();
  await assertFails(setDoc(doc(db, 'users/omar/wishlist/does-not-exist'), item()));
});

test('items with extra fields or a long note are rejected', async () => {
  const db = env.authenticatedContext('omar').firestore();
  await assertFails(setDoc(doc(db, 'users/omar/wishlist/coffee'), item({ isAdmin: true })));
  await assertFails(setDoc(doc(db, 'users/omar/wishlist/coffee'), item({ note: 'x'.repeat(141) })));
});

test('the owner can edit the note but not the price', async () => {
  const db = env.authenticatedContext('lina').firestore();
  await assertSucceeds(updateDoc(doc(db, 'users/lina/wishlist/coffee'), { note: 'For the weekend' }));
  await assertFails(updateDoc(doc(db, 'users/lina/wishlist/coffee'), { price: 0.01 }));
});

test('the owner can remove an item', async () => {
  const db = env.authenticatedContext('lina').firestore();
  await assertSucceeds(deleteDoc(doc(db, 'users/lina/wishlist/coffee')));
});
