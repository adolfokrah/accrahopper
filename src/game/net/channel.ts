/** The one Ably channel everyone in the city shares for presence. */
export const PRESENCE_CHANNEL = 'accra:presence'
/** Street-level events anyone can send: nearby chat bubbles and emotes. */
export const EVENTS_CHANNEL = 'accra:events'
/** A player's private inbox. Only the server publishes here. */
export const USER_CHANNEL = (userId: string) => `user:${userId}`
