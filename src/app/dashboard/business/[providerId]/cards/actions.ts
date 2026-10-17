"use server";

import { requireManager } from "@/lib/auth";
import { CARD_BATCH_SIZES, createCardBatch, unassignedCards, type PrintableCard } from "@/lib/cards";

export type CardsState = { cards?: PrintableCard[]; error?: string; fresh?: boolean };

// Make a new batch of unassigned cards and return them for printing.
export async function makeCards(providerId: string, count: number): Promise<CardsState> {
  const user = await requireManager(providerId);
  if (!(CARD_BATCH_SIZES as readonly number[]).includes(count)) return { error: "Choose how many cards to make." };
  try {
    return { cards: await createCardBatch(providerId, count, user.id), fresh: true };
  } catch (e) {
    console.error("make cards failed:", e instanceof Error ? e.message : e);
    return { error: "Couldn't make the cards. Please try again." };
  }
}

// Cards already made but not handed out yet, to print again (e.g. after a printer jam).
export async function reprintCards(providerId: string): Promise<CardsState> {
  await requireManager(providerId);
  try {
    const cards = await unassignedCards(providerId);
    return cards.length ? { cards } : { error: "You don't have any unassigned cards. Make some first." };
  } catch (e) {
    console.error("reprint cards failed:", e instanceof Error ? e.message : e);
    return { error: "Couldn't load your cards. Please try again." };
  }
}
