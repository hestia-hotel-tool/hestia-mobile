/**
 * The shape a room-and-guest picker needs.
 *
 * Lost & Found's Register modal and the Create Ticket flow both ask the same
 * question — "which room?" — and both used to answer it with their own
 * interface, their own mapping of `listRoomsWithReservationGuests`, and their
 * own card markup. The two drifted: one sorted reservations and one took
 * `reservations[0]`, one resolved Storage paths in a batch and one did it per
 * room. This is the single shape they now share.
 */

export interface RoomPickerGuest {
  id?: string;
  fullName?: string;
  vipCode?: string | null;
  /**
   * A displayable http(s) URL, or `undefined` when the guest has no portrait.
   *
   * Never a synthesised placeholder: the card draws initials for a guest
   * without a photo. Both callers used to fall back to a pravatar URL keyed on
   * the guest id, which attaches a stranger's face to a named, real guest.
   */
  imageUrl?: string;
}

export interface RoomPickerRoom {
  id: string;
  number: string;
  /** Every guest on the chosen reservation, in the order the query returned. */
  guests: RoomPickerGuest[];
  /**
   * The guest the card draws, and the one a caller should attribute to.
   *
   * For an `Arrival/Departure` reservation this is the *departing* guest
   * (index 1 where there is one) — the room has two occupants that day and the
   * one being shown is the one checking out.
   */
  primaryGuest?: RoomPickerGuest;
  checkIn?: string | null;
  checkOut?: string | null;
  guestCount?: number;
  frontOfficeStatus?: string;
}
